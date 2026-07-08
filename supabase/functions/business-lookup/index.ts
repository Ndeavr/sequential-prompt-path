import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleMapsCredentials, googleConnectorAvailable, placesSearchTextRaw } from "../_shared/googleMapsConnector.ts";
import { getGoogleMapsCredentials, googleConnectorAvailable, placesSearchText } from "../_shared/googleMapsConnector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * business-lookup — Search Google Places by business name
 * Returns: city, categories, phone, website, address, rating, etc.
 * Used by BusinessNameSearch component for auto-fill.
 */

// Map Google Place types to UNPRO categories
const TYPE_TO_CATEGORY: Record<string, string> = {
  roofing_contractor: "Toiture",
  roofer: "Toiture",
  electrician: "Électricité",
  electrical_contractor: "Électricité",
  plumber: "Plomberie",
  plumbing_contractor: "Plomberie",
  hvac_contractor: "CVC / Chauffage",
  heating_contractor: "CVC / Chauffage",
  air_conditioning_contractor: "CVC / Chauffage",
  painter: "Peinture",
  painting_contractor: "Peinture",
  carpenter: "Menuiserie",
  general_contractor: "Rénovation générale",
  home_improvement_store: "Rénovation générale",
  contractor: "Rénovation générale",
  foundation_contractor: "Fondation",
  insulation_contractor: "Isolation",
  masonry_contractor: "Maçonnerie",
  landscaper: "Aménagement paysager",
  landscape_contractor: "Aménagement paysager",
  window_contractor: "Fenêtres et portes",
  door_contractor: "Fenêtres et portes",
  excavating_contractor: "Excavation",
  demolition_contractor: "Démolition",
  fence_contractor: "Clôtures",
  flooring_contractor: "Revêtement de sol",
  floor_contractor: "Revêtement de sol",
  deck_contractor: "Terrasses",
  pool_contractor: "Piscines",
  waterproofing_contractor: "Imperméabilisation",
  concrete_contractor: "Béton",
};

const UNPRO_CATEGORIES = [
  "Toiture", "Isolation", "Électricité", "Plomberie",
  "Drainage", "Fondation", "CVC / Chauffage", "Menuiserie",
  "Peinture", "Maçonnerie", "Rénovation générale",
  "Aménagement paysager", "Fenêtres et portes", "Excavation",
  "Démolition", "Clôtures", "Revêtement de sol", "Terrasses",
  "Piscines", "Imperméabilisation", "Béton",
];

function mapTypesToCategories(types: string[]): { primary: string | null; secondary: string[] } {
  const matched = new Set<string>();
  for (const t of types) {
    const cat = TYPE_TO_CATEGORY[t];
    if (cat) matched.add(cat);
  }
  const arr = [...matched];
  return {
    primary: arr[0] || null,
    secondary: arr.slice(1),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const creds = getGoogleMapsCredentials();
  if (!googleConnectorAvailable(creds) && !creds.serverKey && !creds.legacyKey) {
    return new Response(JSON.stringify({ results: [], error: "No API credentials configured" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query, city } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchQuery = city ? `${query} ${city} Québec` : `${query} Québec Canada`;

    const fieldMask =
      "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.primaryTypeDisplayName,places.types,places.addressComponents,places.editorialSummary";

    const res = await placesSearchTextRaw(searchQuery, {
      language: "fr",
      region: "CA",
      maxResults: 5,
      locationBias: {
        rectangle: {
          low: { latitude: 44.9, longitude: -79.8 },   // SW Quebec
          high: { latitude: 49.0, longitude: -57.1 },    // NE Quebec
        },
      },
    }, fieldMask);

    if (!res.places) {
      console.error("business-lookup search failed:", res.error_message);
      return new Response(JSON.stringify({ results: [], error: res.error_message || "Search failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = res.places.map((place: any) => {
      const types = place.types || [];
      const { primary, secondary } = mapTypesToCategories(types);

      // Extract city / province from address components
      const cityComponent = place.addressComponents?.find((c: any) =>
        c.types?.includes("locality")
      );
      const provinceComponent = place.addressComponents?.find((c: any) =>
        c.types?.includes("administrative_area_level_1")
      );

      return {
        place_id: place.id,
        business_name: place.displayName?.text || "",
        address: place.formattedAddress || "",
        city: cityComponent?.longText || city || "",
        province: provinceComponent?.shortText || provinceComponent?.longText || "",
        phone: place.internationalPhoneNumber || "",
        website: place.websiteUri || "",
        rating: place.rating || 0,
        review_count: place.userRatingCount || 0,
        primary_category: primary,
        secondary_categories: secondary,
        google_types: types.slice(0, 8),
        description: place.editorialSummary?.text || "",
      };
    });

    return new Response(JSON.stringify({ results, source: res.source }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("business-lookup error:", err);
    return new Response(JSON.stringify({ results: [], error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
