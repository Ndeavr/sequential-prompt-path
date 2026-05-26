// mission-scrape-trade-cities
// Real scraping from Google Places + Firecrawl fallback.
// Persists into outbound_companies + outbound_leads with mission_id attribution.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/mission-cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
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

async function scrapeGooglePlaces(trade: string, city: string): Promise<ScrapedCompany[]> {
  if (!GOOGLE_PLACES_API_KEY) return [];
  const query = `${trade} ${city} Québec`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=ca&language=fr&key=${GOOGLE_PLACES_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places ${res.status}`);
  const data = await res.json();
  const results: any[] = data.results ?? [];
  const enriched: ScrapedCompany[] = [];
  for (const r of results.slice(0, 20)) {
    // Get details for phone + website
    let phone: string | null = null;
    let website: string | null = null;
    try {
      const dUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r.place_id}&fields=formatted_phone_number,website,formatted_address&key=${GOOGLE_PLACES_API_KEY}`;
      const dRes = await fetch(dUrl);
      if (dRes.ok) {
        const d = await dRes.json();
        phone = d.result?.formatted_phone_number ?? null;
        website = d.result?.website ?? null;
      }
    } catch {}
    enriched.push({
      name: r.name,
      city,
      phone,
      website,
      google_place_id: r.place_id,
      rating: r.rating ?? null,
      review_count: r.user_ratings_total ?? null,
      address: r.formatted_address ?? null,
    });
  }
  return enriched;
}

async function scrapeFirecrawlFallback(trade: string, city: string): Promise<ScrapedCompany[]> {
  if (!FIRECRAWL_API_KEY) return [];
  const query = `${trade} ${city} entrepreneur`;
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 15, country: "ca", lang: "fr" }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const out: ScrapedCompany[] = [];
  const items: any[] = data.data ?? data.web?.results ?? [];
  for (const r of items) {
    try {
      const host = new URL(r.url).hostname.replace(/^www\./, "");
      out.push({
        name: r.title?.split("|")[0]?.trim() || host,
        city,
        website: r.url,
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
      status: "scraping", started_at: new Date().toISOString(),
    }).eq("id", mission_id);

    const seen = new Set<string>();
    const inserted: any[] = [];
    let totalAttempts = 0;
    const targetTotal = mission.target_count ?? 30;
    const perCity = Math.ceil(targetTotal / mission.cities.length);

    for (const city of mission.cities as string[]) {
      // Init territory state row
      await supabase.from("mission_territory_state").upsert({
        mission_id, city, total_slots: 5,
      }, { onConflict: "mission_id,city" });

      let attempts = 0;
      let companies: ScrapedCompany[] = [];
      while (attempts < 3 && companies.length === 0) {
        attempts++;
        totalAttempts++;
        try {
          companies = await scrapeGooglePlaces(mission.trade_slug, city);
          if (companies.length === 0 && attempts >= 2) {
            companies = await scrapeFirecrawlFallback(mission.trade_slug, city);
          }
        } catch (e) {
          console.error("scrape error", city, e);
          if (attempts >= 3) {
            await supabase.from("outbound_admin_alerts").insert({
              alert_type: "mission_scrape_failed",
              severity: "warning",
              payload: { mission_id, city, error: String(e) },
            }).then(() => {}, () => {});
          }
        }
      }

      let cityCount = 0;
      for (const c of companies) {
        if (cityCount >= perCity) break;
        const key = normalizeKey(`${c.name}|${city}`);
        if (seen.has(key)) continue;
        seen.add(key);

        // Insert company (dedup by google_place_id when present)
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
          if (insErr) { console.error("insert company", insErr); continue; }
          companyId = ins.id;
        }

        // Create or attach lead
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
      }
    }

    await supabase.from("outbound_missions").update({ status: "enriching" }).eq("id", mission_id);

    return jsonResponse({
      ok: true, mission_id, scraped: inserted.length, attempts: totalAttempts,
    });
  } catch (e) {
    console.error("mission-scrape failed", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
