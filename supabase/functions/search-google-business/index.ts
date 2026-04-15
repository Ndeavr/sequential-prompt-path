import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  query?: string;
  business_name?: string;
  phone?: string;
  website?: string;
  city?: string;
  category?: string;
  place_id?: string; // for details lookup
}

interface PlaceCandidate {
  place_id: string;
  name: string;
  formatted_address: string;
  phone: string;
  website: string;
  rating: number;
  review_count: number;
  primary_category: string;
  all_categories: string[];
  photos: string[];
  opening_hours: any;
  confidence_score: number;
  strategy_used: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!GOOGLE_PLACES_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: SearchRequest = await req.json();
    const startTime = Date.now();

    // ─── Place Details mode ───
    if (body.place_id) {
      const result = await fetchPlaceDetails(body.place_id, GOOGLE_PLACES_API_KEY);
      return new Response(
        JSON.stringify({ result, latency_ms: Date.now() - startTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Multi-strategy search ───
    const candidates: PlaceCandidate[] = [];
    const strategies: { query: string; label: string; weight: number }[] = [];

    const name = body.business_name || body.query || "";
    const city = body.city || "";
    const phone = body.phone || "";
    const website = body.website || "";
    const category = body.category || "";

    // Strategy 1: Exact name + city (highest confidence)
    if (name && city) {
      strategies.push({ query: `${name} ${city}`, label: "name_city", weight: 1.0 });
    }

    // Strategy 2: Exact name only
    if (name) {
      strategies.push({ query: name, label: "name_only", weight: 0.85 });
    }

    // Strategy 3: Phone number
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        strategies.push({ query: cleanPhone, label: "phone", weight: 0.90 });
      }
    }

    // Strategy 4: Website domain
    if (website) {
      const domain = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
      strategies.push({ query: domain, label: "domain", weight: 0.75 });
    }

    // Strategy 5: Category + city (broad fallback)
    if (category && city) {
      strategies.push({ query: `${category} ${city}`, label: "category_city", weight: 0.50 });
    }

    // Execute strategies in order, stop when we get good results
    const seenPlaceIds = new Set<string>();

    for (const strategy of strategies) {
      try {
        const results = await searchPlaces(strategy.query, GOOGLE_PLACES_API_KEY);

        for (const place of results) {
          if (seenPlaceIds.has(place.place_id)) continue;
          seenPlaceIds.add(place.place_id);

          // Fetch details for each candidate
          const details = await fetchPlaceDetails(place.place_id, GOOGLE_PLACES_API_KEY);
          if (!details) continue;

          // Calculate confidence score
          let confidence = strategy.weight;

          // Boost if name matches closely
          if (name && details.name.toLowerCase().includes(name.toLowerCase())) {
            confidence = Math.min(confidence + 0.15, 1.0);
          }

          // Boost if city matches
          if (city && details.formatted_address?.toLowerCase().includes(city.toLowerCase())) {
            confidence = Math.min(confidence + 0.10, 1.0);
          }

          // Boost if phone matches
          if (phone && details.phone) {
            const cleanInput = phone.replace(/\D/g, "");
            const cleanResult = details.phone.replace(/\D/g, "");
            if (cleanInput === cleanResult || cleanResult.endsWith(cleanInput) || cleanInput.endsWith(cleanResult)) {
              confidence = Math.min(confidence + 0.20, 1.0);
            }
          }

          candidates.push({
            ...details,
            confidence_score: Math.round(confidence * 100) / 100,
            strategy_used: strategy.label,
          });
        }

        // If we have high-confidence results, stop searching
        if (candidates.some((c) => c.confidence_score >= 0.85) && candidates.length >= 1) {
          break;
        }
      } catch (e) {
        console.error(`Strategy ${strategy.label} failed:`, e);
        // Continue to next strategy
      }
    }

    // Sort by confidence descending
    candidates.sort((a, b) => b.confidence_score - a.confidence_score);

    // Limit to top 10
    const topCandidates = candidates.slice(0, 10);

    return new Response(
      JSON.stringify({
        candidates: topCandidates,
        total_found: candidates.length,
        strategies_tried: strategies.map((s) => s.label),
        latency_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("search-google-business error:", err);
    return new Response(
      JSON.stringify({ error: String(err), candidates: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Helpers ───

async function searchPlaces(query: string, apiKey: string): Promise<{ place_id: string }[]> {
  const params = new URLSearchParams({
    input: query,
    key: apiKey,
    types: "establishment",
    language: "fr",
    components: "country:ca",
  });
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.predictions || []).map((p: any) => ({ place_id: p.place_id }));
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceCandidate | null> {
  const fields = [
    "name",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "rating",
    "user_ratings_total",
    "types",
    "address_components",
    "opening_hours",
    "photos",
    "business_status",
  ].join(",");

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=fr&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.result) return null;

  const r = data.result;
  const city =
    r.address_components?.find((c: any) => c.types?.includes("locality"))?.long_name || "";

  return {
    place_id: placeId,
    name: r.name || "",
    formatted_address: r.formatted_address || "",
    phone: r.formatted_phone_number || "",
    website: r.website || "",
    rating: r.rating || 0,
    review_count: r.user_ratings_total || 0,
    primary_category: r.types?.[0] || "",
    all_categories: r.types || [],
    photos: (r.photos || []).slice(0, 3).map((p: any) =>
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${apiKey}`
    ),
    opening_hours: r.opening_hours?.weekday_text || null,
    confidence_score: 0,
    strategy_used: "",
  };
}
