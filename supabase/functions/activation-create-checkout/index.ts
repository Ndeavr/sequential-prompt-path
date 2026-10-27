/**
 * RETIRED — this pipeline checkout charged CAD350 without TPS/TVQ.
 *
 * Do not mint new sessions here: historical run_id links and agent callers
 * cannot prove a verified business, the canonical tax contract, or a signed
 * webhook + 12-month entitlement. The existing identity-first enrollment
 * remains at /contractor/join with its separate release gates.
 *
 * Source-only retirement: deploying this Edge function requires a separate
 * authorized change with hosted tests. No Stripe/DB/queue access here.
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
      error: "legacy_pipeline_checkout_retired",
      message: "Ce lien de paiement ne peut plus être utilisé. Identifiez votre entreprise dans le parcours officiel.",
      next_path: "/contractor/join",
    }),
    { status: 410, headers: corsHeaders },
  );
});
