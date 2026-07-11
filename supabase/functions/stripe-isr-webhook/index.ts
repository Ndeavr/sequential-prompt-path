// DEPRECATED — legacy ISR-only test webhook.
//
// The canonical UNPRO Stripe webhook is now `stripe-unpro-webhook`.
// This function is intentionally neutered so late Stripe retries against the
// old endpoint cannot activate an UNPRO contractor or corrupt UNPRO data.
//
// It still returns HTTP 200 for well-signed ISR test events so Stripe stops
// retrying, but performs no side-effects. All UNPRO metadata is quarantined.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const whSecret = Deno.env.get("STRIPE_ISR_WEBHOOK_SECRET");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const sig = req.headers.get("stripe-signature");
    if (!sig || !whSecret || !stripeKey) {
      return new Response(JSON.stringify({ error: "missing_signature_or_secret" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const raw = await req.text();
    const event = await stripe.webhooks.constructEventAsync(raw, sig, whSecret);

    const md: Record<string, string> =
      ((event.data.object as any)?.metadata as Record<string, string>) || {};
    const isUnpro =
      String(md.platform || "").toLowerCase() === "unpro" ||
      String(md.brand || "").toLowerCase() === "unpro";

    // Log every hit so the admin cockpit can surface migration progress.
    try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      await sb.from("unpro_stripe_webhook_events").upsert({
        stripe_event_id: event.id,
        stripe_account_id: (event as any).account ?? null,
        livemode: !!event.livemode,
        event_type: event.type,
        object_id: (event.data.object as any)?.id ?? null,
        processing_status: "ignored",
        attempt_count: 1,
        processed_at: new Date().toISOString(),
        payload: event as any,
        error_code: isUnpro ? "unpro_event_hit_legacy_endpoint" : "isr_legacy_endpoint",
        error_message: isUnpro
          ? "UNPRO event delivered to deprecated stripe-isr-webhook. Update Stripe endpoint to stripe-unpro-webhook."
          : "Legacy ISR endpoint — no side effects performed.",
      }, { onConflict: "stripe_event_id" });
    } catch (e) {
      console.error("[stripe-isr-webhook] log_failed", (e as Error).message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deprecated: true,
        message: "stripe-isr-webhook is deprecated. Point UNPRO Stripe endpoint to stripe-unpro-webhook.",
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[stripe-isr-webhook][deprecated]", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
