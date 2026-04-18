import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!GOOGLE_PLACES_API_KEY) {
    return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Place Details mode
    if (body.place_id) {
      const fields = "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,address_components,geometry";
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(body.place_id)}&fields=${fields}&language=fr&key=${GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK") {
        return new Response(JSON.stringify({ error: data.status }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const r = data.result;
      const comps: any[] = r.address_components || [];
      const pick = (type: string, useShort = false): string => {
        const c = comps.find((x: any) => Array.isArray(x.types) && x.types.includes(type));
        if (!c) return "";
        return useShort ? (c.short_name || c.long_name || "") : (c.long_name || c.short_name || "");
      };

      const city =
        pick("locality") ||
        pick("sublocality") ||
        pick("administrative_area_level_2");

      return new Response(JSON.stringify({
        result: {
          place_id: body.place_id,
          name: r.name || "",
          address: r.formatted_address || "",
          street_number: pick("street_number"),
          street_name: pick("route"),
          city,
          province: pick("administrative_area_level_1", true),
          postal_code: pick("postal_code"),
          country: pick("country", true) || "CA",
          latitude: r.geometry?.location?.lat ?? null,
          longitude: r.geometry?.location?.lng ?? null,
          phone: r.formatted_phone_number || "",
          website: r.website || "",
          rating: r.rating || 0,
          review_count: r.user_ratings_total || 0,
          types: r.types || [],
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autocomplete mode
    const { input, types, region, language } = body;
    if (!input) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      input,
      key: GOOGLE_PLACES_API_KEY,
      types: types || "establishment",
      language: language || "fr",
    });
    if (region) params.set("components", `country:${region}`);

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    return new Response(JSON.stringify({
      predictions: (data.predictions || []).map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: p.structured_formatting,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
