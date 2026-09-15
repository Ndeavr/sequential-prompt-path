// UNPRO — Activation gratuite canonique (12 mois, service local).
//
// Pont serveur unique entre le parcours d'inscription gratuite et la
// transaction atomique existante `public.activate_free_service_account_from_context`.
//
// Règles absolues :
//  - AUCUN appel Stripe, aucun checkout, aucune carte, aucun plan payant ;
//  - l'utilisateur provient TOUJOURS du JWT, jamais du corps de la requête ;
//  - idempotent : la RPC canonique gère le rejeu (double clic, refresh, retour OAuth) ;
//  - aucun jeton, code OTP ni secret n'est journalisé.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Raisons « normales » : l'offre ne s'applique pas — ce n'est pas une erreur technique. */
const NOT_ELIGIBLE_REASONS = new Set([
  "not_eligible",
  "category_not_eligible",
  "city_full",
  "city_category_full",
  "offer_closed",
  "free_service_context_incomplete",
  "prospect_not_found",
  "invalid_prospect_id",
  "prospect_verified_contact_mismatch",
  "free_service_signup_claimed_by_other",
  "free_service_prospect_conflict",
  "verified_contact_required",
]);

const str = (v: unknown, max = 200): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ ok: false, reason: "not_authenticated" }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user?.id) return json({ ok: false, reason: "not_authenticated" }, 401);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawUtm = (body.utm && typeof body.utm === "object" && !Array.isArray(body.utm))
    ? (body.utm as Record<string, unknown>)
    : {};
  const utm: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawUtm)) {
    const value = str(v, 200);
    // Jamais de jeton brut dans le contexte persisté.
    if (value && k !== "token" && k !== "t") utm[k.slice(0, 40)] = value;
  }

  const context: Record<string, unknown> = {
    prospect_id: str(body.prospect_id, 64),
    business_name: str(body.business_name, 160),
    city: str(body.city, 120),
    trade: str(body.trade, 120),
    source: str(body.source, 60) ?? "free_service_activation",
    utm,
  };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await admin.rpc("activate_free_service_account_from_context", {
    _user_id: user.id,
    _context: context,
  });

  if (error) {
    console.error("[free-service-activate] rpc failed", {
      user_id: user.id,
      code: error.code ?? null,
      message: error.message,
    });
    return json(
      {
        ok: false,
        kind: "error",
        failure_step: "free_activation_transaction",
        failure_code: error.code || "activation_transaction_failed",
        reason: error.message,
      },
      500,
    );
  }

  const payload = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;

  if (payload.ok !== true || payload.activated !== true) {
    const reason = String(payload.reason ?? "activation_not_completed");
    const notEligible = NOT_ELIGIBLE_REASONS.has(reason);
    console.info("[free-service-activate] not activated", { user_id: user.id, reason });
    return json(
      {
        ok: false,
        kind: notEligible ? "not_eligible" : "error",
        failure_step: "free_activation_transaction",
        failure_code: reason,
        reason,
        offer: payload.offer ?? null,
      },
      notEligible ? 200 : 409,
    );
  }

  // Post-condition explicite : une activation gratuite ne crée jamais de checkout.
  if (payload.checkout_created === true) {
    console.error("[free-service-activate] checkout detected on free path", { user_id: user.id });
    return json(
      {
        ok: false,
        kind: "error",
        failure_step: "free_activation_postcondition",
        failure_code: "checkout_created_on_free_path",
      },
      500,
    );
  }

  return json({ ok: true, kind: "activated", ...payload });
});
