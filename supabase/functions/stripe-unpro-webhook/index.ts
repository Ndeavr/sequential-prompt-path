// DEPRECATED — DO NOT USE. This is NOT the production Stripe handler.
//
// Canonical production endpoint: /functions/v1/stripe-webhook
// (Stripe live endpoint we_1Tqjp5CvZwK1QnPVnKuhISaC -> stripe-webhook).
//
// This function is retired to remove any ambiguity: it is wired to ZERO Stripe
// events and must never process payments or activate contractors. It performs
// no signature verification, no DB writes to activation tables, and responds
// 410 Gone so any misconfigured endpoint fails loudly instead of silently
// double-processing revenue events.
//
// If you are here to fix a payment/activation bug, open:
//   supabase/functions/stripe-webhook/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Loud, auditable trace if anything ever hits this retired endpoint.
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let eventId: string | null = null;
    let eventType: string | null = null;
    try {
      const body = await req.clone().json();
      eventId = body?.id ?? null;
      eventType = body?.type ?? null;
    } catch { /* not JSON */ }
    await supabase.from("integration_audit_logs").insert({
      integration_name: "stripe",
      action_name: eventId ?? `deprecated-hit-${Date.now()}`,
      status: "failed",
      error_message:
        `stripe-unpro-webhook is retired (410). event_type=${eventType ?? "unknown"}. ` +
        `Point Stripe to /functions/v1/stripe-webhook.`,
    });
  } catch { /* never block the response */ }

  console.error(
    "[stripe-unpro-webhook] RETIRED endpoint hit — canonical handler is /functions/v1/stripe-webhook",
  );

  return new Response(
    JSON.stringify({
      error: "endpoint_retired",
      canonical_endpoint: "/functions/v1/stripe-webhook",
      message:
        "stripe-unpro-webhook is deprecated and processes nothing. Configure Stripe to send events to stripe-webhook.",
    }),
    { status: 410, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
