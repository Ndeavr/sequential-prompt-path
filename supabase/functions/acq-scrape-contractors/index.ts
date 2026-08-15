// acq-scrape-contractors — Google Places scraping with dedup into contractor_prospects
import { svc, startRun, finishRun, log, cors, requireService } from "../_shared/acq-logger.ts";
import { searchPlacesResilient } from "../_shared/placesGateway.ts";

interface Body { trade: string; city: string; max_results?: number; source?: string; }

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : null;
}
function normalizeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return u.toLowerCase(); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  let body: Body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: cors }); }
  if (!body.trade || !body.city) return new Response(JSON.stringify({ error: "trade et city requis" }), { status: 400, headers: cors });

  const runId = await startRun(s, "scrape", body as any);
  const max = Math.min(body.max_results ?? 20, 60);

  const health = await requireService(s, "google_places");
  if (!health.ok) {
    await log(s, runId, "scrape.health", "blocked", health.reason);
    await finishRun(s, runId, { status: "failed", error_summary: health.reason });
    return new Response(JSON.stringify({ ok: false, blocked: true, reason: health.reason }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  }

  // COST INVARIANT (incident 2026-08): all automated discovery goes through the
  // resilient Places gateway — shared cache, circuit breaker and atomic daily budget.
  let created = 0, skipped = 0, errors = 0;
  let results: any[] = [];
  try {
    const search = await searchPlacesResilient(s, {
      trade: body.trade, city: body.city, limit: Math.min(max, 20), caller: "acq-scrape-contractors",
    });
    if (!search.ok) {
      await log(s, runId, "scrape.api", "blocked", `${search.error_code}: ${search.remediation}`);
      await finishRun(s, runId, { status: "failed", error_summary: search.error_code });
      return new Response(JSON.stringify({ ok: false, blocked: true, error: search.error_code, message: search.remediation }), { status: 200, headers: cors });
    }
    results = search.places.slice(0, max).map((p) => ({
      place_id: p.id,
      name: p.displayName?.text,
      formatted_phone_number: p.nationalPhoneNumber,
      international_phone_number: p.nationalPhoneNumber,
      website: p.websiteUri,
      url: p.googleMapsUri,
      formatted_address: p.formattedAddress,
      rating: null,
      user_ratings_total: null,
    }));

    for (const r0 of results) {
      try {
        const phone = normalizePhone(r0.international_phone_number || r0.formatted_phone_number);
        const websiteHost = normalizeUrl(r0.website);
        const business_name = r0.name || "Sans nom";

        // Dedup: same name+city OR same website host OR same phone
        const orFilters: string[] = [];
        if (websiteHost) orFilters.push(`website_url.ilike.%${websiteHost}%`);
        if (phone) orFilters.push(`phone.eq.${phone}`);
        const { data: dup1 } = await s.from("contractor_prospects").select("id").eq("city", body.city).eq("business_name", business_name).limit(1);
        let isDup = !!dup1?.length;
        if (!isDup && orFilters.length) {
          const { data: dup2 } = await s.from("contractor_prospects").select("id").or(orFilters.join(",")).limit(1);
          isDup = !!dup2?.length;
        }
        if (isDup) { skipped++; continue; }

        const { error: insErr } = await s.from("contractor_prospects").insert({
          business_name,
          trade: body.trade,
          category_slug: body.trade.toLowerCase().replace(/\s+/g, "-"),
          city: body.city,
          region: "QC",
          province: "QC",
          website_url: r0.website || null,
          google_business_url: r0.url || null,
          phone,
          address: r0.formatted_address || null,
          review_count: r0.user_ratings_total ?? 0,
          review_rating: r0.rating ?? null,
          source: body.source || "google_places",
          source_url: r0.url || null,
          discovery_method: "scrape",
          enrichment_status: "pending",
          aipp_status: "pending",
          outreach_status: "not_started",
          onboarding_status: "not_started",
          payment_status: "not_started",
          activation_status: "pending",
        });
        if (insErr) { errors++; await log(s, runId, "scrape.insert", "error", insErr.message, null, { business_name }); }
        else { created++; await log(s, runId, "scrape.insert", "success", business_name); }
      } catch (e) {
        errors++;
        await log(s, runId, "scrape.item", "error", String(e));
      }
    }

    await finishRun(s, runId, {
      status: errors === 0 ? "succeeded" : "partial",
      total_items: results.length,
      succeeded_count: created,
      blocked_count: skipped,
      failed_count: errors,
    });
    return new Response(JSON.stringify({ ok: true, prospects_created: created, duplicates_skipped: skipped, errors, run_id: runId }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    await log(s, runId, "scrape.fatal", "error", String(e));
    await finishRun(s, runId, { status: "failed", error_summary: String(e) });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
