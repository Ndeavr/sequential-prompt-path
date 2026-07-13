// verify-contractor-activation
// Public function. Given { session_id } and/or { token }, returns the real backend
// activation state so the success page can poll instead of trusting Stripe's redirect.
// States: VERIFYING | PROCESSING | ACTIVATED | FAILED
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { session_id, token } = await req.json().catch(() => ({}));
    if (!session_id && !token) return json({ state: "FAILED", reason: "missing_input" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Locate prospect
    let query = supabase.from("prospects").select(
      "id, business_name, main_city, service, telephone, email, contractor_id, activation_paid_at, recommendable, funnel_status, stripe_session_id, landing_token"
    );
    if (session_id) query = query.eq("stripe_session_id", session_id);
    else query = query.eq("landing_token", token);
    let { data: prospect } = await query.maybeSingle();

    // Fallback: token given but session_id not yet stamped → look up by landing_token
    if (!prospect && token) {
      const { data } = await supabase.from("prospects").select(
        "id, business_name, main_city, service, telephone, email, contractor_id, activation_paid_at, recommendable, funnel_status, stripe_session_id, landing_token"
      ).eq("landing_token", token).maybeSingle();
      prospect = data;
    }

    // 2) Confirm Stripe session is actually paid
    let stripePaid = false;
    let stripeSessionId = session_id ?? prospect?.stripe_session_id ?? null;
    if (stripeSessionId) {
      try {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
        const s = await stripe.checkout.sessions.retrieve(stripeSessionId);
        stripePaid = s.payment_status === "paid" || s.status === "complete";
      } catch (e) {
        console.warn("[verify] stripe retrieve failed", (e as Error).message);
      }
    }

    if (!prospect) {
      return json({ state: stripePaid ? "PROCESSING" : "VERIFYING", reason: "prospect_not_found_yet" });
    }

    // 3) Contractor + profile presence
    let contractor: any = null;
    let profile: any = null;
    if (prospect.contractor_id) {
      const { data: c } = await supabase.from("contractors")
        .select("id, business_name, city, phone, email, specialty, account_status, activation_status")
        .eq("id", prospect.contractor_id).maybeSingle();
      contractor = c;
      if (c?.id) {
        const { data: p } = await supabase.from("contractor_profiles")
          .select("id, contractor_id").eq("contractor_id", c.id).maybeSingle();
        profile = p;
      }
    }

    const activated =
      !!prospect.activation_paid_at &&
      !!prospect.contractor_id &&
      !!contractor &&
      !!profile &&
      contractor.account_status === "active" &&
      contractor.activation_status === "activated";

    if (activated) {
      return json({
        state: "ACTIVATED",
        recommendable: !!prospect.recommendable,
        contractor_id: prospect.contractor_id,
        prospect_id: prospect.id,
        business_name: prospect.business_name,
      });
    }

    if (stripePaid) {
      // Payment done but backend has not caught up yet.
      return json({
        state: "PROCESSING",
        has_prospect: true,
        has_contractor: !!contractor,
        has_profile: !!profile,
        prospect_id: prospect.id,
      });
    }

    return json({ state: "VERIFYING", has_prospect: true, prospect_id: prospect.id });
  } catch (e) {
    console.error("[verify-contractor-activation]", (e as Error).message);
    return json({ state: "FAILED", reason: "internal_error" }, 500);
  }
});
