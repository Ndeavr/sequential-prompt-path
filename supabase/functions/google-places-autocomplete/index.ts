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
  "Access-Control-Expose-Headers": "Retry-After",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Plafonds partagés (base de données, fenêtre glissante 10 min, atomiques).
export const LIMITS = {
  predictions: { guest: 15, user: 30, ip: 40 },
  details: { guest: 6, user: 12, ip: 20 },
} as const;

// Cache court des prédictions identiques (même appelant, même saisie) : aucun appel Google, aucun quota.
const cache = new Map<string, { at: number; payload: unknown }>();
const CACHE_MS = 120_000;

async function sha(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Accès : compte connecté OU session invitée Clara vérifiée en base.
  // Jamais d'inscription forcée; quota borné par appelant (anti-abus).
  const auth = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "SERVICE_FAILED" }, 500);
  const body = await req.json().catch(() => ({}));
  let callerKey: string | null = null;
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer && bearer !== anonKey && bearer.split(".").length === 3) {
    const { data } = await createClient(url, anonKey).auth.getUser(bearer);
    if (data?.user) callerKey = `u:${data.user.id}`;
  }
  if (!callerKey) {
    const guest = typeof body.session_token === "string" ? body.session_token.trim() : "";
    if (guest.length >= 16 && guest.length <= 100) {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data } = await admin.from("alex_sessions").select("id")
        .eq("session_token", guest).gte("updated_at", since).limit(1).maybeSingle();
      if (data?.id) callerKey = `g:${data.id}`;
    }
  }
  if (!callerKey) {
    return json({ error: "SESSION_REQUIRED", message: "Session invitée introuvable. Réessayez dans un instant." }, 401);
  }
  const isDetails = !!body.place_id;
  const normInput = typeof body.input === "string" ? body.input.trim().toLowerCase().replace(/\s+/g, " ") : "";
  const cacheKey = `${callerKey}|${normInput}|${body.region ?? "ca"}|${body.language ?? "fr"}`;
  if (!isDetails) {
    if (normInput.length < 4 || normInput.length > 200) return json({ predictions: [] });
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return json(hit.payload);
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const ipKey = `ip:${await sha(ip)}`;
  const kind = isDetails ? "details" : "predictions";
  const lim = LIMITS[kind];
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: gate, error: gateErr } = await admin.rpc("reserve_address_lookup", {
    p_keys: [`${kind}:${callerKey}`, `${kind}:${ipKey}`],
    p_limits: [callerKey.startsWith("u:") ? lim.user : lim.guest, lim.ip],
  });
  if (gateErr || !gate) {
    console.error("[google-places] quota check failed", gateErr?.code);
    return json({ predictions: [], error: "SERVICE_FAILED", message: "Service d'adresses momentanément indisponible." }, 503);
  }
  if (!(gate as { allowed: boolean }).allowed) {
    const retry = Math.max(1, Number((gate as { retry_after_seconds: number }).retry_after_seconds) || 60);
    return new Response(JSON.stringify({ predictions: [], error: "RATE_LIMITED", retry_after_seconds: retry,
      message: "Beaucoup de recherches d'adresse en peu de temps. Votre saisie est conservée « à confirmer »; vous pourrez réessayer sous peu." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retry) } });
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

    const payload = {
      predictions: data.map((p) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: p.structured_formatting,
      })),
      source,
    };
    if (cache.size > 2000) cache.clear();
    cache.set(cacheKey, { at: Date.now(), payload });
    return json(payload);
  } catch (err) {
    console.error("[google-places] unexpected error:", err);
    return json({
      predictions: [],
      error: "SERVICE_FAILED",
      message: String(err),
    }, 200);
  }
});
