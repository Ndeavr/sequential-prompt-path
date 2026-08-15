// PROTECTED FILE — Autopilot Recovery Agent
// Strategy cascade to guarantee real prospects:
//   1) Trade synonyms (FR + EN)
//   2) Adjacent cities expansion
//   3) Google Places pagination (nextPageToken)
// Returns deduplicated real prospects from Google Places.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { searchPlacesResilient } from "../_shared/placesGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GOOGLE_PLACES_API_KEY = (Deno.env.get("GOOGLE_PLACES_SERVER_KEY") || Deno.env.get("GOOGLE_PLACES_API_KEY"))!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ─── Trade synonyms (FR + EN, deterministic) ─────────────────────────────────
const TRADE_SYNONYMS: Record<string, string[]> = {
  "rénovation cuisine et salle de bain": [
    "rénovation cuisine", "rénovation salle de bain", "armoires de cuisine",
    "ébéniste cuisine", "designer cuisine", "entrepreneur rénovation",
    "kitchen renovation", "bathroom renovation", "kitchen cabinets",
  ],
  "rénovation": ["entrepreneur général", "contracteur rénovation", "rénovateur", "general contractor"],
  "plomberie": ["plombier", "plumber", "plomberie résidentielle", "urgence plomberie"],
  "toiture": ["couvreur", "réfection toiture", "roofer", "roofing"],
  "électricité": ["électricien", "maître électricien", "electrician", "panneau électrique"],
  "peinture": ["peintre", "peintre résidentiel", "painter", "peinture intérieure"],
  "hvac": ["chauffage", "climatisation", "thermopompe", "ventilation", "HVAC contractor"],
  "isolation": ["isolation thermique", "uréthane", "insulation"],
  "fenêtres": ["installateur fenêtres", "portes et fenêtres", "windows contractor"],
  "drain": ["nettoyage drain", "débouchage", "drain cleaning"],
};

function getSynonyms(trade: string): string[] {
  const key = trade.toLowerCase().trim();
  if (TRADE_SYNONYMS[key]) return TRADE_SYNONYMS[key];
  // Fuzzy: find any key contained in trade
  for (const k of Object.keys(TRADE_SYNONYMS)) {
    if (key.includes(k) || k.includes(key)) return TRADE_SYNONYMS[k];
  }
  return [trade];
}

// ─── City adjacency (QC metro) ───────────────────────────────────────────────
const CITY_ADJACENCY: Record<string, string[]> = {
  "laval": ["Montréal", "Boisbriand", "Rosemère", "Sainte-Thérèse", "Blainville", "Saint-Eustache"],
  "terrebonne": ["Mascouche", "Repentigny", "Bois-des-Filion", "Lorraine", "Charlemagne"],
  "montréal": ["Laval", "Longueuil", "Westmount", "Mont-Royal", "Anjou", "LaSalle"],
  "longueuil": ["Montréal", "Brossard", "Saint-Lambert", "Boucherville", "Saint-Hubert"],
  "québec": ["Lévis", "L'Ancienne-Lorette", "Saint-Augustin-de-Desmaures", "Beauport"],
  "gatineau": ["Aylmer", "Hull", "Buckingham", "Cantley"],
  "sherbrooke": ["Magog", "Lennoxville", "Rock Forest"],
  "trois-rivières": ["Bécancour", "Cap-de-la-Madeleine", "Shawinigan"],
  "mascouche": ["Terrebonne", "Repentigny", "L'Assomption"],
  "repentigny": ["Terrebonne", "Mascouche", "Charlemagne", "L'Assomption"],
  "blainville": ["Boisbriand", "Sainte-Thérèse", "Mirabel", "Saint-Eustache"],
  "boisbriand": ["Blainville", "Sainte-Thérèse", "Rosemère", "Laval"],
  "brossard": ["Longueuil", "Saint-Lambert", "La Prairie"],
  "saint-jérôme": ["Mirabel", "Sainte-Sophie", "Prévost", "Saint-Hippolyte"],
};

function getAdjacentCities(city: string): string[] {
  const k = city.toLowerCase().trim();
  return CITY_ADJACENCY[k] ?? [];
}

// ─── Google Places search — SINGLE billable path (incident 2026-08) ──────────
// All automated discovery goes through searchPlacesResilient: shared 14-day
// cache, circuit breaker, and atomic 25-calls/day budget. Never fetch directly.
async function searchPlaces(trade: string, city: string): Promise<{ places: any[]; nextPageToken?: string; status: number }> {
  const search = await searchPlacesResilient(supabase, { trade, city, limit: 20, caller: "autopilot-recovery-agent" });
  if (!search.ok) {
    console.warn(`[recovery] places blocked: ${search.error_code}`);
    return { places: [], status: 429 };
  }
  return { places: search.places, status: 200 };
}

// ─── Main recovery handler ───────────────────────────────────────────────────
interface RecoveryPayload {
  run_id: string;
  trade: string;
  cities: string[];
  needed: number; // how many more prospects we need
  already_seen_place_ids?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = (await req.json()) as RecoveryPayload;
    const { run_id, trade, cities, needed } = payload;
    const seenIds = new Set(payload.already_seen_place_ids ?? []);
    const strategiesAttempted: Array<{ strategy: string; query: string; results: number; status?: number }> = [];
    const newProspects: any[] = [];

    const synonyms = getSynonyms(trade);
    const adjacent = cities.flatMap(getAdjacentCities);

    // Build (trade × city) cascade — the gateway keys its cache on that pair.
    const queries: Array<{ trade: string; city: string; strategy: string }> = [];
    for (const syn of synonyms) {
      for (const city of cities) queries.push({ trade: syn, city, strategy: "synonym" });
    }
    for (const city of adjacent) queries.push({ trade, city, strategy: "adjacent_city" });
    for (const syn of synonyms.slice(0, 3)) {
      for (const city of adjacent.slice(0, 3)) queries.push({ trade: syn, city, strategy: "synonym_adjacent" });
    }

    for (const { trade: qTrade, city: qCity, strategy } of queries) {
      if (newProspects.length >= needed) break;
      const q = `${qTrade} ${qCity} Québec`;
      const { places, status } = await searchPlaces(qTrade, qCity);
      let resultsForQuery = 0;
      for (const p of places) {
        if (!p.id || seenIds.has(p.id)) continue;
        seenIds.add(p.id);
        newProspects.push({ ...p, __strategy: strategy, __query: q });
        resultsForQuery++;
        if (newProspects.length >= needed) break;
      }
      strategiesAttempted.push({ strategy, query: q, results: resultsForQuery, status });
      // Budget/circuit blocked → stop the cascade instead of hammering.
      if (status === 429) break;
    }

    // Log to run
    await supabase.from("outbound_run_logs").insert({
      run_id, step: "recovery_agent", status: newProspects.length > 0 ? "ok" : "blocked",
      message: `Recovery agent: ${newProspects.length} nouveaux prospects via ${strategiesAttempted.length} stratégies`,
      payload: { strategies: strategiesAttempted, found: newProspects.length, needed },
    });

    return new Response(JSON.stringify({
      ok: true, prospects: newProspects, strategies_attempted: strategiesAttempted, found: newProspects.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Recovery agent error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erreur recovery agent" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
