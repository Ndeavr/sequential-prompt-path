/**
 * acq-scrape-google-places
 *
 * Scrape Google Places (New API) pour un métier × ville.
 * Utilise dedupeEngine pour scorer chaque candidat (HIGH/MEDIUM/LOW/NONE)
 * et choisir entre INSERT, ENRICH_EXISTING ou flag possible_duplicate.
 *
 * Body: { trade: string, city: string, limit?: number, dry_run?: boolean }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  classifyDuplicate,
  buildEnrichmentPatch,
  normalizeDomain,
} from "../_shared/dedupeEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: Array<{ longText: string; shortText: string; types: string[] }>;
}

function extractCity(p: PlaceResult, fallback: string): string {
  const comp = p.addressComponents?.find((c) => c.types.includes("locality"));
  return comp?.longText ?? fallback;
}
function extractPostal(p: PlaceResult): string | null {
  const comp = p.addressComponents?.find((c) => c.types.includes("postal_code"));
  return comp?.longText ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const mapsConnectorKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const legacyApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const useConnectorGateway = Boolean(lovableKey && mapsConnectorKey);

    if (!useConnectorGateway && !legacyApiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_PLACES_API_KEY missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const trade = String(body.trade ?? "").trim();
    const city = String(body.city ?? "").trim();
    const limit = Math.min(Number(body.limit ?? 20), 60);
    const dryRun = Boolean(body.dry_run ?? false);

    if (!trade || !city) {
      return new Response(JSON.stringify({ error: "trade and city required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = useConnectorGateway
      ? "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText"
      : "https://places.googleapis.com/v1/places:searchText";
    const fieldMask = [
      "places.id","places.displayName","places.formattedAddress","places.nationalPhoneNumber",
      "places.websiteUri","places.googleMapsUri","places.rating","places.userRatingCount",
      "places.primaryType","places.location","places.addressComponents",
    ].join(",");

    const allPlaces: PlaceResult[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    while (allPlaces.length < limit && pages < 3) {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(useConnectorGateway
            ? { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsConnectorKey! }
            : { "X-Goog-Api-Key": legacyApiKey! }),
          "X-Goog-FieldMask": fieldMask + (pageToken ? "" : ",nextPageToken"),
        },
        body: JSON.stringify({
          textQuery: `${trade} ${city} Québec`,
          languageCode: "fr-CA",
          regionCode: "CA",
          pageSize: Math.min(20, limit - allPlaces.length),
          ...(pageToken ? { pageToken } : {}),
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(
          JSON.stringify({ error: "google_places_failed", detail: err, status: resp.status }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const data = await resp.json();
      const places = (data.places ?? []) as PlaceResult[];
      allPlaces.push(...places);
      pageToken = data.nextPageToken;
      pages++;
      if (!pageToken) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    const candidates = allPlaces.slice(0, limit);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          found: candidates.length,
          sample: candidates.slice(0, 5).map((p) => ({
            name: p.displayName?.text, address: p.formattedAddress,
            phone: p.nationalPhoneNumber, website: p.websiteUri,
            rating: p.rating, reviews: p.userRatingCount,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const counters = {
      inserted: 0,
      enriched_existing: 0,
      possible_duplicate: 0,
      skipped_duplicate: 0,
      failed_extraction: 0,
    };
    const touchedIds: string[] = [];

    for (const p of candidates) {
      const placeId = p.id;
      const name = p.displayName?.text;
      if (!placeId || !name) {
        counters.failed_extraction++;
        continue;
      }

      const fresh = {
        source_name: "google_places",
        source: "google_places",
        source_record_id: placeId,
        google_place_id: placeId,
        discovery_method: "google_places_search",
        business_name: name,
        trade,
        category_slug: trade.toLowerCase().replace(/\s+/g, "-"),
        city: extractCity(p, city),
        province: "QC",
        postal_code: extractPostal(p),
        phone: p.nationalPhoneNumber ?? null,
        website_url: p.websiteUri ?? null,
        normalized_domain: normalizeDomain(p.websiteUri),
        google_business_url: p.googleMapsUri ?? null,
        address: p.formattedAddress ?? null,
        review_count: p.userRatingCount ?? 0,
        review_rating: p.rating ?? null,
        raw_data: { google_place: p },
      };

      const match = await classifyDuplicate(
        {
          business_name: fresh.business_name,
          google_place_id: fresh.google_place_id,
          website_url: fresh.website_url,
          normalized_domain: fresh.normalized_domain,
          phone: fresh.phone,
          city: fresh.city,
          address: fresh.address,
        },
        supabase,
      );

      if (match.band === "HIGH" && match.matchedId) {
        // Fetch existing → non-destructive merge
        const { data: existing } = await supabase
          .from("contractor_prospects")
          .select("*")
          .eq("id", match.matchedId)
          .single();

        const patch = buildEnrichmentPatch(existing ?? {}, fresh);
        const hasChanges = Object.keys(patch).length > 0;

        const updates: Record<string, any> = {
          ...patch,
          last_enriched_at: new Date().toISOString(),
          enrichment_count: (existing?.enrichment_count ?? 0) + 1,
          dedupe_confidence: match.confidence,
          dedupe_signals: match.signals,
          ingestion_status: hasChanges ? "enriched_existing" : "skipped_duplicate",
        };

        const { error: upErr } = await supabase
          .from("contractor_prospects")
          .update(updates)
          .eq("id", match.matchedId);

        if (upErr) {
          console.error("enrich update failed", upErr.message);
          counters.failed_extraction++;
        } else {
          touchedIds.push(match.matchedId);
          if (hasChanges) counters.enriched_existing++;
          else counters.skipped_duplicate++;
        }
        continue;
      }

      // MEDIUM → insert flagged + push review
      // LOW / NONE → straight insert
      const ingestion_status = match.band === "MEDIUM" ? "possible_duplicate" : "inserted";
      const insertRow = {
        ...fresh,
        enrichment_status: "pending",
        dedupe_confidence: match.confidence > 0 ? match.confidence : null,
        dedupe_matched_id: match.matchedId,
        dedupe_signals: match.signals,
        ingestion_status,
        needs_review: match.band === "MEDIUM",
      };

      const { data: ins, error: insErr } = await supabase
        .from("contractor_prospects")
        .insert(insertRow)
        .select("id")
        .single();

      if (insErr || !ins) {
        console.error("insert failed", insErr?.message, name);
        counters.failed_extraction++;
        continue;
      }

      touchedIds.push(ins.id);

      if (match.band === "MEDIUM") {
        counters.possible_duplicate++;
        await supabase.from("prospect_dedupe_reviews").insert({
          candidate_prospect_id: ins.id,
          existing_prospect_id: match.matchedId,
          confidence: match.confidence,
          signals: match.signals,
          new_payload: fresh,
          status: "pending",
        });
      } else {
        counters.inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        trade,
        city,
        found: candidates.length,
        ...counters,
        touched_ids: touchedIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
