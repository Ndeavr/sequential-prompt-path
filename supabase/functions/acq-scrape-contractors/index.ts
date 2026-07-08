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

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const legacyKey = Deno.env.get("GOOGLE_PLACES_SERVER_KEY") || Deno.env.get("GOOGLE_PLACES_API_KEY");
  const useGateway = !!(lovableKey && mapsKey);

  let created = 0, skipped = 0, errors = 0;
  let results: any[] = [];
  try {
    if (useGateway) {
      // Places API (New) via Lovable connector gateway — single call returns all needed fields
      const r = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey!,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({
          textQuery: `${body.trade} ${body.city} Québec`,
          languageCode: "fr-CA",
          regionCode: "CA",
          maxResultCount: Math.min(max, 20),
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        await log(s, runId, "scrape.api", "error", `Gateway ${r.status}: ${t.slice(0, 300)}`);
        await finishRun(s, runId, { status: "failed", error_summary: `Gateway ${r.status}` });
        return new Response(JSON.stringify({ ok: false, error: `Gateway ${r.status}`, message: t.slice(0, 300) }), { status: 200, headers: cors });
      }
      const j = await r.json();
      results = (j.places || []).slice(0, max).map((p: any) => ({
        place_id: p.id,
        name: p.displayName?.text,
        formatted_phone_number: p.nationalPhoneNumber,
        international_phone_number: p.internationalPhoneNumber,
        website: p.websiteUri,
        url: p.googleMapsUri,
        formatted_address: p.formattedAddress,
        rating: p.rating,
        user_ratings_total: p.userRatingCount,
      }));
    } else if (legacyKey) {
      // Legacy fallback
      const query = encodeURIComponent(`${body.trade} ${body.city} Québec`);
      const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&region=ca&language=fr&key=${legacyKey}`);
      const j = await r.json();
      if (j.status !== "OK" && j.status !== "ZERO_RESULTS") {
        await log(s, runId, "scrape.api", "error", `${j.status}: ${j.error_message || ""}`);
        await finishRun(s, runId, { status: "failed", error_summary: j.status });
        return new Response(JSON.stringify({ ok: false, error: j.status, message: j.error_message }), { status: 200, headers: cors });
      }
      results = (j.results || []).slice(0, max);
      // Hydrate with details
      for (const r0 of results) {
        const detUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r0.place_id}&fields=name,formatted_phone_number,international_phone_number,website,url,formatted_address,rating,user_ratings_total&language=fr&key=${legacyKey}`;
        try {
          const dr = await fetch(detUrl);
          const dj = await dr.json();
          Object.assign(r0, dj.result || {});
        } catch { /* keep partial */ }
      }
    } else {
      await log(s, runId, "scrape.api", "error", "Aucune clé Google Places disponible");
      await finishRun(s, runId, { status: "failed", error_summary: "no_google_key" });
      return new Response(JSON.stringify({ ok: false, error: "no_google_key" }), { status: 200, headers: cors });
    }

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
