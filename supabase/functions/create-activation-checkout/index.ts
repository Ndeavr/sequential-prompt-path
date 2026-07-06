// Create a Stripe one-time checkout for the 1$/7d activation offer.
// Public: prospects can pay before having an account (email collected by Stripe).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVATION_PRICE_ID = "price_1TZD1rCvZwK1QnPVPZEGhJrs";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { slug, email, source, utm } = body ?? {};
    if (!slug) {
      return new Response(JSON.stringify({ error: "missing_slug" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const isSprint = source === "isolation-qc" || String(slug).startsWith("sprint-");

    // Resolve prospect from war_prospects (same source as /pro/:slug landing).
    // Fallback to legacy prospect_pages for backward compatibility.
    // Sprint flow (no prospect yet) skips this lookup.
    let prospectRow: { id: string; slug: string } | null = null;
    if (!isSprint) {
      const wp = await supabase
        .from("war_prospects").select("id, slug").eq("slug", slug).maybeSingle();
      prospectRow = wp.data as any;
      if (!prospectRow) {
        const legacy = await supabase
          .from("prospect_pages").select("id, slug").eq("slug", slug).maybeSingle();
        prospectRow = legacy.data as any;
      }
      if (!prospectRow) {
        return new Response(JSON.stringify({ error: "prospect_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const successPath = isSprint
      ? `/activation-success?session_id={CHECKOUT_SESSION_ID}&source=isolation-qc`
      : `/activation-success?session_id={CHECKOUT_SESSION_ID}&slug=${encodeURIComponent(slug)}`;
    const cancelPath = isSprint ? `/isolation-qc?canceled=1` : `/pro/${encodeURIComponent(slug)}?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: ACTIVATION_PRICE_ID, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${origin}${successPath}`,
      cancel_url: `${origin}${cancelPath}`,
      metadata: {
        prospect_slug: slug,
        prospect_id: prospectRow?.id ?? "",
        offer: "activation_7d",
        source: source ?? "",
        campaign_variant: utm?.camp ?? "",
        utm_city: utm?.city ?? "",
        utm_company: utm?.company ?? "",
      },
      locale: "fr",
    });

    // Best-effort event log (table may not exist in all envs).
    try {
      await supabase.from("prospect_page_events").insert({
        slug, event_type: "checkout_started", metadata: { session_id: session.id },
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
