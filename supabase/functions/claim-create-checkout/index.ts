/**
 * Retired claim payment endpoint.
 *
 * This historical endpoint constructed an untaxed CAD350 session, accepted
 * promo codes and trusted caller-supplied redirect origins. It must never
 * produce another Stripe session. Enrollment remains available via the
 * canonical /contractor/join route with the gated tax-aware checkout.
 *
 * Do not re-enable this endpoint without a separately reviewed signed-webhook
 * and business-ownership reconciliation path.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      ok: false,
      error: "legacy_checkout_retired",
      message: "Ce parcours de paiement n'est plus offert. Identifiez votre entreprise dans le parcours officiel.",
      next_path: "/contractor/join",
    }),
    { status: 410, headers: corsHeaders },
  );
});
