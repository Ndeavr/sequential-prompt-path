// mission-scrape-trade-cities
// Real scraping from Google Places + Firecrawl fallback.
// Persists into outbound_companies + outbound_leads with mission_id attribution.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/mission-cors.ts";
import { searchPlacesResilient } from "../_shared/placesGateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

type ScrapedCompany = {
  name: string;
  city: string;
  phone?: string | null;
  website?: string | null;
  google_place_id?: string | null;
  rating?: number | null;
  review_count?: number | null;
  address?: string | null;
};

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// COST INVARIANT (incident 2026-08): discovery only through the resilient
// gateway — shared 14-day cache, circuit breaker, 25 external calls/day max.
async function scrapeGooglePlaces(
  sb: ReturnType<typeof createClient>,
  trade: string,
  city: string,
): Promise<ScrapedCompany[]> {
  const search = await searchPlacesResilient(sb, { trade, city, limit: 20, caller: "mission-scrape-trade-cities" });
  if (!search.ok) {
    console.warn(`[places] blocked: ${search.error_code} — ${search.remediation}`);
    return [];
  }
  return search.places.map((r) => ({
    name: r.displayName?.text ?? "Sans nom",
    city,
    phone: r.nationalPhoneNumber ?? null,
    website: r.websiteUri ?? null,
    google_place_id: r.id ?? null,
    rating: null,
    review_count: null,
    address: r.formattedAddress ?? null,
  }));
}

function extractFirecrawlItems(data: any): any[] {
  // Firecrawl v2 shape variations:
  //  - { success, data: [...] }
  //  - { success, data: { web: [...] } }
  //  - { success, data: { web: { results: [...] } } }
  //  - { web: { results: [...] } }
  const candidates: any[] = [
    data?.data,
    data?.data?.web,
    data?.data?.web?.results,
    data?.web,
    data?.web?.results,
    data?.results,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

async function scrapeFirecrawlFallback(trade: string, city: string): Promise<ScrapedCompany[]> {
  if (!FIRECRAWL_API_KEY) return [];
  const query = `${trade} ${city} entrepreneur Québec`;
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 15, country: "ca", lang: "fr" }),
  });
  if (!res.ok) {
    console.error("firecrawl http", res.status);
    return [];
  }
  const data = await res.json();
  const items = extractFirecrawlItems(data);
  console.log(`[firecrawl] "${query}" => ${items.length}`);
  const out: ScrapedCompany[] = [];
  for (const r of items) {
    const url = r?.url || r?.link;
    if (!url) continue;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      // Skip obvious aggregators
      if (/(facebook|linkedin|kijiji|pagesjaunes|yelp|youtube|instagram|google)\./i.test(host)) continue;
      out.push({
        name: (r.title || "").split("|")[0]?.trim() || host,
        city,
        website: url,
      });
    } catch {}
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { mission_id } = await req.json();
    if (!mission_id) return jsonResponse({ error: "mission_id required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: mission, error: mErr } = await supabase
      .from("outbound_missions").select("*").eq("id", mission_id).single();
    if (mErr || !mission) return jsonResponse({ error: "mission not found" }, 404);

    await supabase.from("outbound_missions").update({
      status: "scraping", started_at: new Date().toISOString(), last_error: null,
    }).eq("id", mission_id);

    const seen = new Set<string>();
    const inserted: any[] = [];
    const perCityDiag: Record<string, { places: number; firecrawl: number; inserted: number }> = {};
    const errors: any[] = [];
    const targetTotal = mission.target_count ?? 30;
    const perCity = Math.ceil(targetTotal / mission.cities.length);

    for (const city of mission.cities as string[]) {
      const diag = { places: 0, firecrawl: 0, inserted: 0 };
      perCityDiag[city] = diag;

      await supabase.from("mission_territory_state").upsert({
        mission_id, city, total_slots: 5,
      }, { onConflict: "mission_id,city" });

      let companies: ScrapedCompany[] = [];
      try {
        companies = await scrapeGooglePlaces(mission.trade_slug, city);
        diag.places = companies.length;
      } catch (e) {
        console.error("places err", city, e);
        errors.push({ phase: "places", city, error: String(e) });
      }

      if (companies.length === 0) {
        try {
          companies = await scrapeFirecrawlFallback(mission.trade_slug, city);
          diag.firecrawl = companies.length;
        } catch (e) {
          console.error("firecrawl err", city, e);
          errors.push({ phase: "firecrawl", city, error: String(e) });
        }
      }

      let cityCount = 0;
      for (const c of companies) {
        if (cityCount >= perCity) break;
        const key = normalizeKey(`${c.name}|${city}`);
        if (seen.has(key)) continue;
        seen.add(key);

        const { data: existing } = c.google_place_id
          ? await supabase.from("outbound_companies")
              .select("id").eq("google_place_id", c.google_place_id).maybeSingle()
          : { data: null } as any;

        let companyId: string;
        if (existing?.id) {
          companyId = existing.id;
          await supabase.from("outbound_companies").update({
            mission_id, trade: mission.trade_slug, updated_at: new Date().toISOString(),
          }).eq("id", companyId);
        } else {
          const { data: ins, error: insErr } = await supabase.from("outbound_companies").insert({
            company_name: c.name,
            city: c.city,
            phone: c.phone,
            website_url: c.website,
            google_place_id: c.google_place_id,
            google_rating: c.rating,
            review_count: c.review_count ?? 0,
            address: c.address,
            trade: mission.trade_slug,
            specialty: mission.trade_slug,
            mission_id,
            business_status: "active",
            language: "fr",
          }).select("id").single();
          if (insErr) { console.error("insert company", insErr); errors.push({ phase: "insert", city, error: insErr.message }); continue; }
          companyId = ins.id;
        }

        const { data: existingLead } = await supabase.from("outbound_leads")
          .select("id").eq("company_id", companyId).maybeSingle();
        if (!existingLead) {
          await supabase.from("outbound_leads").insert({
            company_id: companyId,
            mission_id,
            company_name: c.name,
            phone: c.phone,
            website_url: c.website,
            domain: c.website ? (() => { try { return new URL(c.website!).hostname; } catch { return null; } })() : null,
            specialty: mission.trade_slug,
            crm_status: "new",
            pipeline_stage: "scraped",
          });
        } else {
          await supabase.from("outbound_leads").update({ mission_id })
            .eq("id", existingLead.id);
        }

        inserted.push({ companyId, name: c.name, city });
        cityCount++;
        diag.inserted++;
      }
    }

    const diagnostics = {
      per_city: perCityDiag,
      total_inserted: inserted.length,
      errors,
      has_places_key: !!getPlacesKey(),
      has_firecrawl_key: !!FIRECRAWL_API_KEY,
    };

    const next_status = inserted.length === 0 ? "scrape_failed" : "enriching";
    await supabase.from("outbound_missions").update({
      status: next_status,
      last_error: inserted.length === 0 ? diagnostics : null,
    }).eq("id", mission_id);

    return jsonResponse({
      ok: inserted.length > 0,
      mission_id,
      scraped: inserted.length,
      diagnostics,
    });
  } catch (e) {
    console.error("mission-scrape failed", e);
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const body = await req.clone().json().catch(() => ({}));
      if (body?.mission_id) {
        await supabase.from("outbound_missions").update({
          status: "scrape_failed",
          last_error: { fatal: String(e) },
        }).eq("id", body.mission_id);
      }
    } catch {}
    return jsonResponse({ error: String(e) }, 500);
  }
});
