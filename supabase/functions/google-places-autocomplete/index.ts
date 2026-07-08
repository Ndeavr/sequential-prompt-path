import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getGoogleMapsCredentials,
  googleConnectorAvailable,
  placeDetails,
  placesAutocomplete,
} from "../_shared/googleMapsConnector.ts";

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

  const creds = getGoogleMapsCredentials();
  if (!googleConnectorAvailable(creds) && !creds.serverKey && !creds.legacyKey) {
    console.error("[google-places] no Google Maps credentials configured");
    return json({
      predictions: [],
      error: "API_KEY_MISSING",
      message: "Aucune clé Google Maps configurée",
    }, 200);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const debug = new URL(req.url).searchParams.get("debug") === "1";

    // ---------- Place Details ----------
    if (body.place_id) {
      const { data, source, google_status, error_message } = await placeDetails(body.place_id, {
        language: "fr",
      });

      if (!data) {
        console.error("[google-places][details] status=", google_status, "msg=", error_message);
        return json({
          error: google_status || "DETAILS_FAILED",
          message: error_message || "Google Places details error",
          source,
        }, 200);
      }

      return json({
        result: {
          place_id: data.place_id,
          name: data.name,
          address: data.address,
          street_number: data.street_number,
          street_name: data.street_name,
          city: data.city,
          province: data.province,
          postal_code: data.postal_code,
          country: data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          phone: data.phone,
          website: data.website,
          rating: data.rating,
          review_count: data.review_count,
          types: data.types,
        },
        source,
      });
    }

    // ---------- Autocomplete ----------
    const { input, types, region, language } = body;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return json({ predictions: [] });
    }

    const { data, source, google_status, error_message } = await placesAutocomplete(input.trim(), {
      types: types || "address",
      region: region || "ca",
      language: language || "fr",
    });

    if (!data) {
      console.error(
        "[google-places][autocomplete] status=",
        google_status,
        "msg=",
        error_message,
        "input=",
        input,
      );
      return json({
        predictions: [],
        error: google_status || "AUTOCOMPLETE_FAILED",
        message: error_message || "Google Places autocomplete error",
        source,
        ...(debug ? { debug_input: input } : {}),
      }, 200);
    }

    if (data.length === 0) {
      console.log("[google-places][autocomplete] zero results for:", input);
    } else {
      console.log("[google-places][autocomplete]", data.length, "results for:", input, "via", source);
    }

    return json({
      predictions: data.map((p) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: p.structured_formatting,
      })),
      source,
      ...(debug ? { debug_status: google_status, debug_input: input } : {}),
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
