// acq-scrape-contractors — Google Places scraping with dedup into contractor_prospects
import { svc, startRun, finishRun, log, cors, requireService } from "../_shared/acq-logger.ts";

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

  const key = Deno.env.get("GOOGLE_PLACES_API_KEY")!;
  const query = encodeURIComponent(`${body.trade} ${body.city} Québec`);

  let created = 0, skipped = 0, errors = 0;
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&region=ca&language=fr&key=${key}`);
    const j = await r.json();
    if (j.status !== "OK" && j.status !== "ZERO_RESULTS") {
      await log(s, runId, "scrape.api", "error", `${j.status}: ${j.error_message || ""}`);
      await finishRun(s, runId, { status: "failed", error_summary: j.status });
      return new Response(JSON.stringify({ ok: false, error: j.status, message: j.error_message }), { status: 200, headers: cors });
    }
    const results = (j.results || []).slice(0, max);

    for (const r0 of results) {
      try {
        // Details for phone + website
        const detUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r0.place_id}&fields=name,formatted_phone_number,international_phone_number,website,url,formatted_address,rating,user_ratings_total&language=fr&key=${key}`;
        const dr = await fetch(detUrl);
        const dj = await dr.json();
        const det = dj.result || {};
        const phone = normalizePhone(det.international_phone_number || det.formatted_phone_number);
        const websiteHost = normalizeUrl(det.website);
        const business_name = det.name || r0.name;

        // Dedup: same name+city OR same website host OR same phone
        const orFilters: string[] = [];
        if (websiteHost) orFilters.push(`website_url.ilike.%${websiteHost}%`);
        if (phone) orFilters.push(`phone.eq.${phone}`);
        const dupQ = s.from("contractor_prospects").select("id").eq("city", body.city).eq("business_name", business_name).limit(1);
        const { data: dup1 } = await dupQ;
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
          website_url: det.website || null,
          google_business_url: det.url || null,
          phone,
          address: det.formatted_address || r0.formatted_address || null,
          review_count: det.user_ratings_total ?? 0,
          review_rating: det.rating ?? null,
          source: body.source || "google_places",
          source_url: det.url || null,
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
