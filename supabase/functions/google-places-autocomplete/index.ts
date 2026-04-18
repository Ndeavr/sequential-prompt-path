import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("[google-places] GOOGLE_PLACES_API_KEY missing");
    return json({
      predictions: [],
      error: "API_KEY_MISSING",
      message: "GOOGLE_PLACES_API_KEY not configured",
    }, 200);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const debug = new URL(req.url).searchParams.get("debug") === "1";

    // ---------- Place Details ----------
    if (body.place_id) {
      const fields =
        "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,address_components,geometry";
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        body.place_id,
      )}&fields=${fields}&language=fr&key=${GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK") {
        console.error("[google-places][details] status=", data.status, "msg=", data.error_message);
        return json({
          error: data.status,
          message: data.error_message || "Google Places details error",
          ...(debug ? { debug_url: url.replace(GOOGLE_PLACES_API_KEY, "***") } : {}),
        }, 200);
      }

      const r = data.result;
      const comps: any[] = r.address_components || [];
      const pick = (type: string, useShort = false): string => {
        const c = comps.find((x: any) => Array.isArray(x.types) && x.types.includes(type));
        if (!c) return "";
        return useShort ? (c.short_name || c.long_name || "") : (c.long_name || c.short_name || "");
      };
      const city =
        pick("locality") || pick("sublocality") || pick("administrative_area_level_2");

      return json({
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
      });
    }

    // ---------- Autocomplete ----------
    const { input, types, region, language } = body;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return json({ predictions: [] });
    }

    const params = new URLSearchParams({
      input: input.trim(),
      key: GOOGLE_PLACES_API_KEY,
      types: types || "address",
      language: language || "fr",
    });
    if (region) params.set("components", `country:${region}`);

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    // Surface upstream errors clearly to client
    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(
        "[google-places][autocomplete] status=",
        data.status,
        "msg=",
        data.error_message,
        "input=",
        input,
      );
      return json({
        predictions: [],
        error: data.status,
        message: data.error_message || "Google Places autocomplete error",
        ...(debug ? { debug_url: url.replace(GOOGLE_PLACES_API_KEY, "***") } : {}),
      }, 200);
    }

    if (data.status === "ZERO_RESULTS") {
      console.log("[google-places][autocomplete] zero results for:", input);
    } else {
      console.log("[google-places][autocomplete] OK", (data.predictions || []).length, "results for:", input);
    }

    return json({
      predictions: (data.predictions || []).map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: p.structured_formatting,
      })),
      ...(debug ? { debug_status: data.status, debug_url: url.replace(GOOGLE_PLACES_API_KEY, "***") } : {}),
    });
  } catch (err) {
    console.error("[google-places] unexpected error:", err);
    return json({
      predictions: [],
      error: "SERVICE_FAILED",
      message: String(err),
    }, 200);
  }
});
