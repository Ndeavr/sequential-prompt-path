/**
 * acq-scrape-google-places
 *
 * Scrape Google Places (New API) pour un métier × ville et insère dans
 * `contractor_prospects` avec dédoublonnage par (source_record_id = place_id)
 * ou (business_name + city).
 *
 * Body: { trade: string, city: string, limit?: number, dry_run?: boolean }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
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
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
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

    // Google Places API (New) - searchText
    const url = "https://places.googleapis.com/v1/places:searchText";
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.nationalPhoneNumber",
      "places.websiteUri",
      "places.googleMapsUri",
      "places.rating",
      "places.userRatingCount",
      "places.primaryType",
      "places.location",
      "places.addressComponents",
    ].join(",");

    const allPlaces: PlaceResult[] = [];
    let pageToken: string | undefined;
    let pages = 0;

    while (allPlaces.length < limit && pages < 3) {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask + (pageToken ? "" : ",nextPageToken"),
        },
        body: JSON.stringify({
          textQuery: `${trade} ${city} Québec`,
          languageCode: "fr",
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
            name: p.displayName?.text,
            address: p.formattedAddress,
            phone: p.nationalPhoneNumber,
            website: p.websiteUri,
            rating: p.rating,
            reviews: p.userRatingCount,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert into contractor_prospects (dedupe on source_record_id)
    let inserted = 0;
    let skipped = 0;
    const insertedIds: string[] = [];

    for (const p of candidates) {
      const placeId = p.id;
      if (!placeId || !p.displayName?.text) {
        skipped++;
        continue;
      }

      const { data: existing } = await supabase
        .from("contractor_prospects")
        .select("id")
        .eq("source_record_id", placeId)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const row = {
        source_name: "google_places",
        source: "google_places",
        source_record_id: placeId,
        discovery_method: "google_places_search",
        business_name: p.displayName.text,
        trade,
        category_slug: trade.toLowerCase().replace(/\s+/g, "-"),
        city: extractCity(p, city),
        province: "QC",
        postal_code: extractPostal(p),
        phone: p.nationalPhoneNumber ?? null,
        website_url: p.websiteUri ?? null,
        google_business_url: p.googleMapsUri ?? null,
        address: p.formattedAddress ?? null,
        review_count: p.userRatingCount ?? 0,
        review_rating: p.rating ?? null,
        enrichment_status: "pending",
        raw_data: { google_place: p },
      };

      const { data: ins, error: insErr } = await supabase
        .from("contractor_prospects")
        .insert(row)
        .select("id")
        .single();

      if (insErr) {
        console.error("insert failed", insErr.message, p.displayName.text);
        skipped++;
      } else if (ins) {
        inserted++;
        insertedIds.push(ins.id);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true, trade, city, found: candidates.length, inserted, skipped,
        inserted_ids: insertedIds,
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
