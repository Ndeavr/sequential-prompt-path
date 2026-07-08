// Admin diagnostic — audits Google API key environment in this Edge runtime
// and runs a live autocomplete probe via the Lovable connector.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getGoogleMapsCredentials, googleConnectorAvailable, placesAutocomplete } from "../_shared/googleMapsConnector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_KEYS = [
  "LOVABLE_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_PLACES_SERVER_KEY",
  "GOOGLE_PLACES_API_KEY",
  "GOOGLE_GEOCODING_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GOOGLE_CLOUD_STT_API_KEY",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
];

const KEY_HINT_PATTERNS = [/GOOGLE/i, /MAPS/i, /PLACES/i, /GEMINI/i, /GEN_LANG/i];

function maskKey(k: string | null | undefined) {
  if (!k) return null;
  if (k.length < 12) return "***";
  return `${k.slice(0, 6)}…${k.slice(-4)} (len=${k.length})`;
}

function fingerprintProject(k: string | null | undefined): string | null {
  if (!k) return null;
  // Google API keys typically start with AIza followed by 35 chars; we cannot
  // identify project from the key itself, but we can label format validity.
  if (/^AIza[0-9A-Za-z_-]{35}$/.test(k)) return "format_valid_google_api_key";
  return "format_unknown";
}

async function probeAutocomplete(input: string) {
  const t0 = Date.now();
  try {
    const { data, source, google_status, error_message } = await placesAutocomplete(input.trim(), {
      types: "address",
      region: "ca",
      language: "fr",
    });
    return {
      endpoint: "connector/google_maps/places/v1",
      http_status: 200,
      google_status: google_status ?? (data ? "OK" : "ZERO_RESULTS"),
      error_message: error_message ?? null,
      predictions_count: data?.length ?? 0,
      latency_ms: Date.now() - t0,
      source,
    };
  } catch (e) {
    return {
      endpoint: "connector/google_maps/places/v1",
      http_status: 0,
      google_status: "FETCH_ERROR",
      error_message: String(e),
      predictions_count: 0,
      latency_ms: Date.now() - t0,
      source: "error",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Admin gate
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "auth_error", detail: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({} as any));
  const action: string = body?.action ?? "scan";

  // Discover env vars matching target list and patterns
  const envSnapshot: Record<string, string | undefined> = {};
  for (const name of TARGET_KEYS) envSnapshot[name] = Deno.env.get(name) ?? undefined;
  // Also scan ALL env for hints
  const allEnv = Deno.env.toObject();
  const matched: Array<{
    name: string;
    masked: string | null;
    fingerprint: string | null;
    side: "server";
    present: boolean;
    risk: string;
    feature: string;
  }> = [];

  const seen = new Set<string>();
  const consider = (name: string, val: string | undefined) => {
    if (seen.has(name)) return;
    seen.add(name);
    const present = !!val;
    matched.push({
      name,
      masked: maskKey(val),
      fingerprint: fingerprintProject(val),
      side: "server",
      present,
      risk: !present ? "missing" : (name.includes("OAUTH") ? "oauth_secret" : "ok"),
      feature: featureFor(name),
    });
  };

  for (const k of TARGET_KEYS) consider(k, envSnapshot[k]);
  for (const [k, v] of Object.entries(allEnv)) {
    if (KEY_HINT_PATTERNS.some((re) => re.test(k))) consider(k, v);
  }

  let liveProbe: any = null;
  if (action === "probe" || body?.probe) {
    const connector = googleConnectorAvailable();
    if (!connector) {
      liveProbe = { error: "Lovable Google Maps connector not configured (LOVABLE_API_KEY + GOOGLE_MAPS_API_KEY)" };
    } else {
      liveProbe = {
        connector_available: true,
        ...(await probeAutocomplete(body?.input || "1234 rue Sainte-Catherine, Montréal")),
      };
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      env_summary: matched.sort((a, b) => Number(b.present) - Number(a.present) || a.name.localeCompare(b.name)),
      live_probe: liveProbe,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

function featureFor(name: string): string {
  if (/PLACES/i.test(name)) return "Places / Address Autocomplete / Geocoding";
  if (/MAPS/i.test(name)) return "Maps JavaScript / Static Maps";
  if (/GEOCODING/i.test(name)) return "Geocoding";
  if (/GEMINI|GOOGLE_AI|GEN_LANG/i.test(name)) return "Gemini AI";
  if (/STT/i.test(name)) return "Speech-to-Text";
  if (/OAUTH/i.test(name)) return "Google OAuth (Calendar)";
  return "Unknown";
}
