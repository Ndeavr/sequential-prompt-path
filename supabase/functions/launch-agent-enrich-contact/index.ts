/**
 * launch-agent-enrich-contact
 *
 * Backfills phone/email on outbound_companies rows that the Scout has rejected
 * for being non-contactable. Without this, the pool of 100+ companies is
 * structurally unusable and no lead can reach DISCOVERED.
 *
 * Sources, in order:
 *   1. Google Places Details (server-side key) — best for phone
 *   2. Firecrawl scrape of the company website — best for email (mailto:)
 *
 * Hard contract: every run reports exactly how many rows became contactable.
 * No fake success.
 */
import { corsHeaders, adminClient, logLaunchEvent } from "../_shared/launch.ts";
import { resolvePlacesKey } from "../_shared/launchKeys.ts";
import { reportOutcome, BlockReason, FailureCode } from "../_shared/reliability.ts";

interface PoolRow {
  id: string;
  company_name: string | null;
  website?: string | null;
  google_place_id?: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const TEL_RE = /(?:\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/;

function cleanEmail(raw: string): string | null {
  const e = raw.toLowerCase().trim();
  if (e.includes("sentry") || e.includes("noreply") || e.endsWith(".png") || e.endsWith(".jpg")) return null;
  return e;
}

async function fetchPlacesDetails(placeId: string): Promise<{ phone: string | null; website: string | null; error?: string }> {
  const k = resolvePlacesKey();
  if (!k) return { phone: null, website: null, error: "no_places_key" };
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=international_phone_number,formatted_phone_number,website&key=${k.key}`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.status && j.status !== "OK") {
      return { phone: null, website: null, error: `${j.status}: ${j.error_message ?? ""}` };
    }
    const res = j.result ?? {};
    return {
      phone: res.international_phone_number ?? res.formatted_phone_number ?? null,
      website: res.website ?? null,
    };
  } catch (e) {
    return { phone: null, website: null, error: `network: ${String(e)}` };
  }
}

async function firecrawlScrape(url: string): Promise<{ markdown: string | null; error?: string }> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return { markdown: null, error: "no_firecrawl_key" };
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { markdown: null, error: `http_${r.status}: ${t.slice(0, 120)}` };
    }
    const j = await r.json();
    return { markdown: j?.data?.markdown ?? j?.markdown ?? null };
  } catch (e) {
    return { markdown: null, error: `network: ${String(e)}` };
  }
}

function extractFromMarkdown(md: string): { phone: string | null; email: string | null } {
  const emails = md.match(EMAIL_RE) ?? [];
  const email = emails.map(cleanEmail).find(Boolean) ?? null;
  const tel = md.match(TEL_RE);
  const phone = tel ? `+1${tel[1]}${tel[2]}${tel[3]}` : null;
  return { phone, email };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const batch = Math.min(Number(body.batch ?? 15), 40);
  const sb = adminClient();

  // Pick rows with neither phone nor email in target cities
  const TARGET = ["Laval", "Montréal", "Montreal", "Terrebonne", "Repentigny", "Longueuil"];
  const { data: pool, error } = await sb
    .from("outbound_companies")
    .select("id, company_name, website, google_place_id, phone, email, city")
    .or(`phone.is.null,email.is.null`)
    .limit(batch * 3);

  if (error) {
    await reportOutcome({
      operation: "launch.enrich_contact.run",
      outcome: "failed",
      failure_code: FailureCode.SUPABASE_TIMEOUT,
      payload: { error: error.message },
    });
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targets = (pool ?? []).filter((r: PoolRow) => {
    if (r.phone && r.email) return false;
    if (!r.google_place_id && !r.website) return false;
    if (!r.city) return false;
    return TARGET.some(t => r.city!.toLowerCase().includes(t.toLowerCase()));
  }).slice(0, batch);

  if (targets.length === 0) {
    await reportOutcome({
      operation: "launch.enrich_contact.run",
      outcome: "partial",
      next_action: "No enrichable rows in target cities (need google_place_id or website).",
      payload: { pool_size: pool?.length ?? 0 },
    });
    await logLaunchEvent({
      agent: "launch-agent-enrich-contact",
      event: "no_targets",
      success: false,
      message: `Aucune ligne enrichissable (pool=${pool?.length ?? 0})`,
    });
    return new Response(JSON.stringify({ ok: true, enriched: 0, scanned: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let enriched = 0;
  const errors: string[] = [];

  for (const row of targets) {
    let phone = row.phone;
    let email = row.email;
    let website = row.website;

    // 1) Places details first
    if (row.google_place_id && (!phone || !website)) {
      const det = await fetchPlacesDetails(row.google_place_id);
      if (det.error) errors.push(`places(${row.id.slice(0,8)}): ${det.error}`);
      if (!phone && det.phone) phone = det.phone;
      if (!website && det.website) website = det.website;
    }

    // 2) Firecrawl scrape for email + phone fallback
    if (website && (!email || !phone)) {
      const scrape = await firecrawlScrape(website);
      if (scrape.error) errors.push(`firecrawl(${row.id.slice(0,8)}): ${scrape.error}`);
      if (scrape.markdown) {
        const ex = extractFromMarkdown(scrape.markdown);
        if (!email && ex.email) email = ex.email;
        if (!phone && ex.phone) phone = ex.phone;
      }
    }

    const patch: Record<string, unknown> = {};
    if (phone && phone !== row.phone) patch.phone = phone;
    if (email && email !== row.email) patch.email = email;
    if (website && website !== row.website) patch.website = website;
    if (Object.keys(patch).length === 0) continue;

    const { error: upErr } = await sb.from("outbound_companies").update(patch).eq("id", row.id);
    if (upErr) {
      errors.push(`update(${row.id.slice(0,8)}): ${upErr.message}`);
      continue;
    }
    enriched++;
  }

  await logLaunchEvent({
    agent: "launch-agent-enrich-contact",
    event: enriched > 0 ? "contact_enriched" : "no_contact_found",
    success: enriched > 0,
    message: enriched > 0
      ? `+${enriched}/${targets.length} contacts enrichis`
      : `0/${targets.length} contacts trouvés. Erreurs: ${errors.slice(0, 3).join(" | ") || "n/a"}`,
    payload: { enriched, scanned: targets.length, errors: errors.slice(0, 10) },
  });

  await reportOutcome({
    operation: "launch.enrich_contact.run",
    outcome: enriched > 0 ? "achieved" : "partial",
    payload: { enriched, scanned: targets.length, errors: errors.slice(0, 10) },
    next_action: enriched === 0 ? `0 contacts trouvés sur ${targets.length} cibles. Erreurs dominantes: ${errors[0] ?? "none"}` : undefined,
  });

  return new Response(JSON.stringify({ ok: true, enriched, scanned: targets.length, errors: errors.slice(0, 10) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
