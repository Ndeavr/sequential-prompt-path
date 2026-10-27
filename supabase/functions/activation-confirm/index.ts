/**
 * Legacy Stripe return-page helper — deliberately fail-closed.
 *
 * A browser return with a session_id or slug is NOT an activation receipt.
 * This endpoint previously wrote activated flags from Stripe's paid status
 * without the signed webhook, business ownership and 12-month entitlement.
 *
 * Until an independently reviewed read-only verified-receipt lookup exists,
 * every invocation returns a generic pending result. Only the existing
 * authenticated Stripe webhook may create payment/entitlement evidence.
 *
 * No DB, Stripe, authentication, email or queue side effects.
 * Source change only: a separate authorized Edge deployment is required.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }
  // Do not parse or reflect any caller-supplied session, slug, or email.
  return json({
    ok: false,
    paid: false,
    status: "verification_pending",
    code: "signed_webhook_entitlement_required",
    message: "Le retour Stripe ne confirme pas à lui seul le paiement ou le droit de 12 mois.",
  }, 202);
});
