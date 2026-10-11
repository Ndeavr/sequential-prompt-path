import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

  const auth = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey || !auth.startsWith("Bearer ") || auth === `Bearer ${anonKey}`) {
    return json({ error: "AUTH_REQUIRED", message: "Connectez-vous pour vérifier une adresse." }, 401);
  }
  const client = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: caller, error: authError } = await client.auth.getUser(auth.slice(7));
  if (authError || !caller.user) return json({ error: "AUTH_REQUIRED" }, 401);

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
    const sessionToken = typeof body.sessionToken === "string" && /^[a-f0-9-]{36}$/i.test(body.sessionToken) ? body.sessionToken : undefined;
    if (body.place_id && (typeof body.place_id !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(body.place_id))) return json({ error: "INVALID_PLACE_ID" }, 400);

    // ---------- Place Details ----------
    if (body.place_id) {
      const { data, source, google_status, error_message } = await placeDetails(body.place_id, {
        language: "fr",
        sessionToken,
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
    if (!input || typeof input !== "string" || input.trim().length < 3 || input.length > 200) {
      return json({ predictions: [] });
    }

    const { data, source, google_status, error_message } = await placesAutocomplete(input.trim(), {
      types: types || "address",
      region: region || "ca",
      language: language || "fr",
      sessionToken,
    });

    if (!data) {
      console.error(
        "[google-places][autocomplete] status=",
        google_status,
        "msg=",
        error_message,
      );
      return json({
        predictions: [],
        error: google_status || "AUTOCOMPLETE_FAILED",
        message: error_message || "Google Places autocomplete error",
        source,
      }, 200);
    }

    if (data.length === 0) {
      console.log("[google-places][autocomplete] zero results");
    } else {
      console.log("[google-places][autocomplete]", data.length, "results via", source);
    }

    return json({
      predictions: data.map((p) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: p.structured_formatting,
      })),
      source,
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
