// Creates the $1 Stripe checkout for a sprint prospect landing.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVATION_PRICE_ID = "price_1TZD1rCvZwK1QnPVPZEGhJrs";
const PUBLIC_BASE = Deno.env.get("PUBLIC_APP_URL") ?? "https://unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const softFail = (code: string) =>
    new Response(JSON.stringify({ ok: false, error: code }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  try {
    const { slug, email } = await req.json();
    if (!slug) return softFail("missing_slug");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sp } = await supabase
      .from("sms_sprint_prospects")
      .select("id, company_name, city, category, variant, campaign_id")
      .eq("tracking_slug", slug).maybeSingle();
    if (!sp) return softFail("prospect_not_found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || PUBLIC_BASE;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      line_items: [{ price: ACTIVATION_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/activer/${slug}/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/activer/${slug}`,
      metadata: {
        sms_sprint: "1",
        sprint_slug: slug,
        sprint_prospect_id: sp.id,
        campaign_id: sp.campaign_id ?? "",
        variant: sp.variant ?? "",
      },
    });

    // Log checkout_started + move activation_status
    await supabase.from("sms_sprint_link_events").insert({
      tracking_slug: slug,
      sprint_prospect_id: sp.id,
      event: "checkout_started",
      meta: { stripe_session: session.id },
    });
    await supabase.from("sms_sprint_prospects")
      .update({ activation_status: "checkout_started" })
      .eq("id", sp.id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
