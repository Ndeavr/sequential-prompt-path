// Confirm a Stripe activation checkout, mark prospect activated, send magic link.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { session_id, slug } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "missing_session_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const paid = session.payment_status === "paid";
    if (!paid) {
      return new Response(JSON.stringify({ ok: false, status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const effectiveSlug = slug || (session.metadata?.prospect_slug as string);
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

    if (effectiveSlug) {
      await supabase.from("prospect_pages").update({
        activated: true,
        activated_at: new Date().toISOString(),
        stripe_customer_id: customerId,
      }).eq("slug", effectiveSlug);

      await supabase.from("prospect_page_events").insert({
        slug: effectiveSlug, event_type: "activated", metadata: { session_id, email },
      });

      await supabase.from("sms_campaigns")
        .update({ activated_at: new Date().toISOString(), conversion_status: "activated" })
        .eq("short_link", effectiveSlug);
    }

    // Send magic link if we have an email and no account yet
    let dashboardUrl: string | null = null;
    if (email) {
      try {
        const origin = req.headers.get("origin") || "https://unpro.ca";
        const { data: link } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `${origin}/dashboard?welcome=1&slug=${encodeURIComponent(effectiveSlug ?? "")}` },
        });
        dashboardUrl = link?.properties?.action_link ?? null;
      } catch {
        // ignore: account creation is best-effort
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      slug: effectiveSlug,
      email,
      magic_link: dashboardUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
