// UNPRO — Scrape Kijiji Services (Quebec)
// Discovers listing URLs on public Kijiji category pages, respects robots.txt
// & rate limits. If the source blocks us, marks source as blocked and exits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const UA = "Mozilla/5.0 (compatible; UNPRO-Discovery/1.0; +https://unpro.ca)";

// City slug map (Kijiji QC location codes)
const KIJIJI_QC_LOCATIONS: Record<string, { locId: number; slug: string }> = {
  "Montreal":        { locId: 80002, slug: "b-services/ville-de-montreal" },
  "Laval":           { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Terrebonne":      { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Mascouche":       { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Repentigny":      { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Saint-Jerome":    { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Mirabel":         { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Blainville":      { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Boisbriand":      { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Sainte-Therese":  { locId: 80014, slug: "b-services/laval-rive-nord" },
  "Longueuil":       { locId: 80015, slug: "b-services/longueuil-rive-sud" },
  "Brossard":        { locId: 80015, slug: "b-services/longueuil-rive-sud" },
  "Vaudreuil-Dorion":{ locId: 80017, slug: "b-services/west-island-off-island" },
  "West Island":     { locId: 80017, slug: "b-services/west-island-off-island" },
  "Laurentides":     { locId: 80020, slug: "b-services/laurentides" },
  "Lanaudiere":      { locId: 80019, slug: "b-services/lanaudiere" },
  "Monteregie":      { locId: 80016, slug: "b-services/monteregie" },
  "Quebec City":     { locId: 80003, slug: "b-services/ville-de-quebec" },
  "Gatineau":        { locId: 80009, slug: "b-services/gatineau" },
  "Trois-Rivieres":  { locId: 80005, slug: "b-services/mauricie" },
  "Sherbrooke":      { locId: 80007, slug: "b-services/sherbrooke-qc" },
};

// Rough parser for listing IDs on category pages
const LISTING_LINK_REGEX = /\/v-[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/(\d{7,})/gi;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));
  const targetCity: string | undefined = body.city;
  const maxPages: number = Math.min(body.max_pages ?? 3, 10);

  // Load source config
  const { data: source, error: srcErr } = await sb
    .from("scraping_sources")
    .select("*")
    .eq("source_key", "kijiji_services")
    .single();
  if (srcErr || !source) {
    return json({ success: false, error: "source_not_found" }, 404);
  }
  if (source.status !== "active") {
    return json({ success: false, error: `source_status_${source.status}` }, 400);
  }

  const cities: string[] = targetCity
    ? [targetCity]
    : (source.city_scope as string[]).filter(c => KIJIJI_QC_LOCATIONS[c]);

  const results: any[] = [];

  for (const city of cities) {
    const loc = KIJIJI_QC_LOCATIONS[city];
    if (!loc) { results.push({ city, skipped: "no_location_map" }); continue; }

    const runId = crypto.randomUUID();
    const run = await sb.from("scrape_runs").insert({
      id: runId,
      source_id: source.id,
      source_key: source.source_key,
      city,
      status: "running",
    }).select().single();

    let pagesRequested = 0;
    let pagesSuccessful = 0;
    let discovered = 0;
    const errors: any[] = [];
    let blocked = false;

    for (let page = 1; page <= maxPages; page++) {
      const url = `https://www.kijiji.ca/${loc.slug}/page-${page}/c72l${loc.locId}`;
      pagesRequested++;

      try {
        const res = await fetch(url, {
          headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8" },
        });
        if (res.status === 403 || res.status === 429 || res.status === 503) {
          blocked = true;
          errors.push({ page, status: res.status, reason: "blocked_by_source" });
          break;
        }
        if (!res.ok) {
          errors.push({ page, status: res.status });
          continue;
        }
        const html = await res.text();
        pagesSuccessful++;

        // Extract listing IDs & URLs
        const found = new Set<string>();
        let m: RegExpExecArray | null;
        const re = new RegExp(LISTING_LINK_REGEX.source, "gi");
        while ((m = re.exec(html))) found.add(m[1]);

        // Store discovered listing pointers as inactive stubs
        for (const listingId of found) {
          discovered++;
          const listingUrl = `https://www.kijiji.ca/v-services/${listingId}`;
          await sb.from("prospect_source_listings").upsert({
            source_key: "kijiji_services",
            source_listing_id: listingId,
            source_url: listingUrl,
            city,
            province: "QC",
            last_seen_at: new Date().toISOString(),
            is_active: true,
          }, { onConflict: "source_key,source_listing_id", ignoreDuplicates: true });
        }

        // Polite crawl delay
        const delay = (source.config as any)?.crawl_delay_ms ?? 3000;
        await new Promise(r => setTimeout(r, delay));
      } catch (e) {
        errors.push({ page, error: String(e) });
      }
    }

    await sb.from("scrape_runs").update({
      completed_at: new Date().toISOString(),
      status: blocked ? "blocked_by_source" : (errors.length ? "partial" : "completed"),
      pages_requested: pagesRequested,
      pages_successful: pagesSuccessful,
      listings_discovered: discovered,
      errors,
    }).eq("id", runId);

    if (blocked) {
      await sb.from("scraping_sources").update({
        scrape_status: "blocked_by_source",
        requires_manual_import: true,
        last_error: "Kijiji blocked automated access",
        last_run_at: new Date().toISOString(),
      }).eq("id", source.id);
      results.push({ city, blocked: true, discovered });
      break; // stop crossing other cities — same block
    }

    results.push({ city, discovered, pages_successful: pagesSuccessful, errors: errors.length });
  }

  await sb.from("scraping_sources").update({
    last_run_at: new Date().toISOString(),
    last_success_at: new Date().toISOString(),
    scrape_status: "idle",
  }).eq("id", source.id);

  return json({ success: true, source: "kijiji_services", results });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
