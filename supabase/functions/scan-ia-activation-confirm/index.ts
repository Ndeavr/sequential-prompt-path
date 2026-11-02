/**
 * Legacy Scan IA confirmation endpoint — deliberately fail-closed.
 *
 * Stripe Checkout's return URL and any browser-provided report token are not
 * proof of a signed payment event or a 12-month business entitlement.
 * The old handler could write activated_at via service-role credentials based
 * on a paid Checkout session and an unrelated, caller-supplied session_token.
 *
 * Do not restore a write path here until issue #86 has an isolated E2E proof
 * tying signed Stripe webhook -> unique business -> payment ledger ->
 * 12-month entitlement (plus replay/idempotency and refund handling).
 *
 * This source change does NOT verify any deployed Edge function.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ paid: false, activated: false, code: "method_not_allowed" }, 405);
  }

  // NEVER interpret a Checkout session ID or session_token as activation proof.
  // No Stripe retrieval, Supabase service-role client, or database writes.
  return json(
    {
      paid: false,
      activated: false,
      code: "signed_activation_verification_required",
      message: "Activation non confirmée. Si vous avez payé, contactez UNPRO sans repayer.",
    },
    410,
  );
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
