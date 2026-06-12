// pro-founder-verify-session — Verify Stripe checkout session, mark prospect as paid,
// and return contractor identifiers so the welcome page can route to the live profile.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId requis");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required" ||
      session.status === "complete";

    if (!paid) {
      return new Response(JSON.stringify({ paid: false, status: session.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const prospectId = (session.metadata?.prospect_id as string) || "";
    const email =
      (session.customer_details?.email as string) ||
      (session.customer_email as string) ||
      "";

    let prospect: Record<string, any> | null = null;
    if (prospectId) {
      const { data } = await admin
        .from("founder_score_prospects")
        .select("*")
        .eq("id", prospectId)
        .maybeSingle();
      prospect = data ?? null;
      await admin
        .from("founder_score_prospects")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_session_id: session.id,
        })
        .eq("id", prospectId);
    }

    return new Response(
      JSON.stringify({
        paid: true,
        session_id: session.id,
        prospect_id: prospectId || null,
        contractor_id: prospect?.contractor_id ?? prospectId ?? null,
        email,
        company: prospect?.company ?? null,
        trade: prospect?.trade ?? null,
        city: prospect?.city ?? null,
        website: prospect?.website ?? null,
        score: prospect?.score ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
