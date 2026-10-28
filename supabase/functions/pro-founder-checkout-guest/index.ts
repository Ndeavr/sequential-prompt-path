/**
 * LEGACY / RETIRED — pro-founder-checkout-guest
 *
 * This route formerly created a LIVE $350 Checkout with an unverified
 * "up to 5 exclusive appointments guaranteed" claim and a user-supplied
 * redirect origin. Its offer_kind=pack_350 metadata did NOT identify the
 * canonical entry_pack_350 entitlement, so a paid session could mark a
 * founder prospect paid without creating the verified 12-month receipt.
 *
 * Fail closed instead of charging anyone on an unsupported path.
 * The existing voluntary contractor self-serve entry is /contractor/join.
 * Re-opening any checkout requires separate tax, webhook, consent, and
 * hosted end-to-end proof. This source change is NOT a production deploy.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({
    code: "legacy_founder_checkout_retired",
    error: "Ce parcours de paiement n'est plus disponible. Aucun paiement n'a été créé.",
    next_path: "/contractor/join",
  }), { status: 410, headers: corsHeaders });
});
