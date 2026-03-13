import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Normalize a phone to digits-only for comparison */
function normalizePhone(p: string | null): string {
  return (p || "").replace(/\D/g, "");
}

/** Extract root domain from URL */
function extractDomain(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return (url || "").replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].toLowerCase();
  }
}

/** Simple string similarity (Dice coefficient) */
function similarity(a: string, b: string): number {
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  if (!sa || !sb) return 0;
  const bigramsA = new Set<string>();
  for (let i = 0; i < sa.length - 1; i++) bigramsA.add(sa.slice(i, i + 2));
  let matches = 0;
  for (let i = 0; i < sb.length - 1; i++) {
    if (bigramsA.has(sb.slice(i, i + 2))) matches++;
  }
  return (2 * matches) / (sa.length - 1 + sb.length - 1);
}

interface MatchSignals {
  name_match: number;
  phone_match: number;
  domain_match: number;
  address_match: number;
  city_match: number;
}

function computeMatchConfidence(
  gmbResult: any,
  contractor: { business_name: string; phone: string; website: string; address: string; city: string }
): { confidence: number; signals: MatchSignals } {
  const signals: MatchSignals = {
    name_match: similarity(gmbResult.displayName?.text || "", contractor.business_name || ""),
    phone_match: normalizePhone(gmbResult.internationalPhoneNumber) === normalizePhone(contractor.phone) ? 1 : 0,
    domain_match: extractDomain(gmbResult.websiteUri) === extractDomain(contractor.website) ? 1 : 0,
    address_match: similarity(gmbResult.formattedAddress || "", contractor.address || ""),
    city_match: similarity(
      gmbResult.addressComponents?.find((c: any) => c.types?.includes("locality"))?.longText || "",
      contractor.city || ""
    ),
  };

  // Weighted confidence
  const confidence = Math.min(
    1,
    signals.name_match * 0.35 +
      signals.phone_match * 0.25 +
      signals.domain_match * 0.2 +
      signals.address_match * 0.1 +
      signals.city_match * 0.1
  );

  return { confidence, signals };
}

/** Generate mock GMB results when no API key is available */
function generateMockResults(businessName: string, city: string) {
  const base = {
    displayName: { text: businessName },
    formattedAddress: `1234 Rue Saint-Denis, ${city || "Montréal"}, QC H2X 3K2`,
    internationalPhoneNumber: "+1 514-555-1234",
    websiteUri: `https://www.${businessName.toLowerCase().replace(/\s+/g, "")}.ca`,
    rating: 4.6,
    userRatingCount: 47,
    primaryType: "plumber",
    primaryTypeDisplayName: { text: "Plombier" },
    types: ["plumber", "contractor"],
    regularOpeningHours: {
      weekdayDescriptions: [
        "Lundi: 08h00–17h00", "Mardi: 08h00–17h00", "Mercredi: 08h00–17h00",
        "Jeudi: 08h00–17h00", "Vendredi: 08h00–17h00", "Samedi: Fermé", "Dimanche: Fermé",
      ],
    },
    photos: Array.from({ length: 8 }, (_, i) => ({
      name: `photos/mock_${i}`,
      widthPx: 800,
      heightPx: 600,
    })),
    editorialSummary: { text: `Services de rénovation résidentielle et commerciale dans la région de ${city || "Montréal"}.` },
    location: { latitude: 45.5231, longitude: -73.5714 },
    id: `mock_place_${Date.now()}`,
    addressComponents: [
      { longText: city || "Montréal", types: ["locality"] },
      { longText: "Québec", types: ["administrative_area_level_1"] },
    ],
  };

  // Return primary match + a weaker secondary match
  return [
    base,
    {
      ...base,
      displayName: { text: `${businessName} Inc.` },
      formattedAddress: `5678 Boul. Décarie, ${city || "Montréal"}, QC H4A 3J5`,
      internationalPhoneNumber: "+1 514-555-9876",
      rating: 3.9,
      userRatingCount: 12,
      id: `mock_place_alt_${Date.now()}`,
    },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractor_id } = await req.json();
    if (!contractor_id) {
      return new Response(JSON.stringify({ error: "contractor_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Get contractor data for matching
    const { data: contractor, error: cErr } = await sb
      .from("contractors")
      .select("business_name, phone, website, address, city, province")
      .eq("id", contractor_id)
      .single();

    if (cErr || !contractor) {
      return new Response(JSON.stringify({ error: "Contractor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    let places: any[];

    if (googleApiKey) {
      // Real Google Places API (Text Search)
      const query = `${contractor.business_name} ${contractor.city || ""} ${contractor.province || "Québec"}`;
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleApiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.primaryTypeDisplayName,places.types,places.regularOpeningHours,places.photos,places.editorialSummary,places.location,places.addressComponents",
        },
        body: JSON.stringify({ textQuery: query, languageCode: "fr", maxResultCount: 5 }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("Google Places API error:", res.status, errBody);
        // Fallback to mock
        places = generateMockResults(contractor.business_name, contractor.city);
      } else {
        const data = await res.json();
        places = data.places || [];
      }
    } else {
      // Mock mode
      console.log("No GOOGLE_PLACES_API_KEY, using mock data");
      places = generateMockResults(contractor.business_name, contractor.city);
    }

    // Compute match confidence for each result
    const results = places.map((place: any) => {
      const { confidence, signals } = computeMatchConfidence(place, contractor);
      return {
        place_id: place.id,
        name: place.displayName?.text || "",
        address: place.formattedAddress || "",
        phone: place.internationalPhoneNumber || "",
        website: place.websiteUri || "",
        rating: place.rating || 0,
        review_count: place.userRatingCount || 0,
        category_primary: place.primaryTypeDisplayName?.text || place.primaryType || "",
        categories_secondary: (place.types || []).slice(0, 5),
        hours: place.regularOpeningHours?.weekdayDescriptions || [],
        photo_count: place.photos?.length || 0,
        description: place.editorialSummary?.text || "",
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        match_confidence: Math.round(confidence * 1000) / 1000,
        match_signals: signals,
        is_mock: !googleApiKey,
      };
    });

    // Sort by confidence descending
    results.sort((a: any, b: any) => b.match_confidence - a.match_confidence);

    return new Response(JSON.stringify({ results, contractor_name: contractor.business_name }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search-gmb-profile error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
