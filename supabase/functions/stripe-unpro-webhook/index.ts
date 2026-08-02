// UNPRO Stripe live webhook — canonical endpoint.
// URL: https://<project>.supabase.co/functions/v1/stripe-unpro-webhook
//
// Never rename this back to stripe-isr-webhook. ISR is a separate brand and
// must never activate UNPRO contractors.
//
// Contract:
//   - Verify Stripe signature BEFORE parsing.
//   - Idempotent via unpro_stripe_webhook_events(stripe_event_id).
//   - Return 200 for processed, duplicate, ignored, and quarantined events.
//   - Return 400 for missing/invalid signature.
//   - Return 500 only for unrecoverable DB errors (so Stripe retries).
//   - SMS / email / analytics failures are logged but do NOT fail the webhook.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  UNPRO_STRIPE_ACCOUNT_ID,
  UNPRO_SUPPORTED_EVENTS,
  checkUnproMetadata,
  extractObjectId,
  mapStripeSubscriptionStatus,
} from "../_shared/unproStripe.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const stripeKey =
    Deno.env.get("UNPRO_STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("UNPRO_STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !whSecret) {
    console.error("[stripe-unpro-webhook] missing UNPRO_STRIPE_SECRET_KEY or UNPRO_STRIPE_WEBHOOK_SECRET");
    return json({ error: "missing_stripe_secrets" }, 500);
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return json({ error: "missing_signature" }, 400);

  const rawBody = await req.text();

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, whSecret);
  } catch (err) {
    console.error("[stripe-unpro-webhook] signature_invalid", (err as Error).message);
    return json({ error: "signature_invalid" }, 400);
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const eventId = event.id;
  const objectId = extractObjectId(event);
  const livemode = !!event.livemode;
  const eventAccount = (event as any).account || null;

  // 1) Idempotency: try to insert; if conflict, fetch existing status.
  const { error: insertErr } = await sb.from("unpro_stripe_webhook_events").insert({
    stripe_event_id: eventId,
    stripe_account_id: eventAccount,
    livemode,
    event_type: event.type,
    object_id: objectId,
    processing_status: "processing",
    attempt_count: 1,
    last_attempt_at: new Date().toISOString(),
    payload: event as any,
  });

  if (insertErr) {
    // duplicate → already seen. Bump attempt but do not reprocess side-effects.
    const { data: existing } = await sb
      .from("unpro_stripe_webhook_events")
      .select("processing_status,attempt_count")
      .eq("stripe_event_id", eventId)
      .maybeSingle();
    await sb
      .from("unpro_stripe_webhook_events")
      .update({
        attempt_count: (existing?.attempt_count ?? 0) + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", eventId);
    return json({ ok: true, duplicate: true, status: existing?.processing_status });
  }

  // 2) Guard: livemode must be true AND event must belong to UNPRO Stripe account.
  if (!livemode) {
    await markIgnored(sb, eventId, "not_livemode");
    return json({ ok: true, ignored: "not_livemode" });
  }
  if (eventAccount && eventAccount !== UNPRO_STRIPE_ACCOUNT_ID) {
    await markIgnored(sb, eventId, `wrong_account:${eventAccount}`);
    return json({ ok: true, ignored: "wrong_account" });
  }

  // 3) Unknown event → ignore (200).
  if (!UNPRO_SUPPORTED_EVENTS.has(event.type)) {
    await markIgnored(sb, eventId, `unsupported_event:${event.type}`);
    return json({ ok: true, ignored: "unsupported_event" });
  }

  // 4) Dispatch.
  try {
    const result = await handleEvent(stripe, sb, event);

    if (result?.quarantine) {
      await sb
        .from("unpro_stripe_webhook_events")
        .update({
          processing_status: "ignored",
          processed_at: new Date().toISOString(),
          processing_result: result as any,
          error_code: "quarantined",
          error_message: result.reason || "quarantined",
        })
        .eq("stripe_event_id", eventId);
      return json({ ok: true, quarantined: true, reason: result.reason });
    }

    await sb
      .from("unpro_stripe_webhook_events")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        processing_result: (result ?? {}) as any,
      })
      .eq("stripe_event_id", eventId);

    return json({ ok: true, event_type: event.type });
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error("[stripe-unpro-webhook] processing_failed", event.type, message);
    await sb
      .from("unpro_stripe_webhook_events")
      .update({
        processing_status: "retry_pending",
        error_code: "processing_failed",
        error_message: message,
      })
      .eq("stripe_event_id", eventId);
    // Return 500 so Stripe retries the delivery.
    return json({ error: "processing_failed", message }, 500);
  }
});

async function markIgnored(sb: any, eventId: string, reason: string) {
  await sb
    .from("unpro_stripe_webhook_events")
    .update({
      processing_status: "ignored",
      processed_at: new Date().toISOString(),
      error_code: reason,
    })
    .eq("stripe_event_id", eventId);
}

// ---------------- handlers ----------------

interface HandleResult {
  quarantine?: boolean;
  reason?: string;
  contractor_id?: string | null;
  action?: string;
  [k: string]: unknown;
}

async function handleEvent(
  stripe: Stripe,
  sb: any,
  event: Stripe.Event,
): Promise<HandleResult> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return handleCheckoutCompleted(stripe, sb, event);

    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      return handleCheckoutFailed(sb, event);

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.trial_will_end":
      return handleSubscriptionEvent(sb, event);

    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
      return handleInvoiceEvent(sb, event);

    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
      return handlePaymentIntentEvent(sb, event);

    case "charge.refunded":
    case "charge.dispute.created":
      return handleChargeEvent(sb, event);
  }
  return { action: "noop" };
}

async function handleCheckoutCompleted(
  _stripe: Stripe,
  sb: any,
  event: Stripe.Event,
): Promise<HandleResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  const md = (session.metadata ?? {}) as Record<string, string>;

  const check = checkUnproMetadata(md);
  if (!check.ok) {
    await auditRow(sb, {
      stripe_event_id: event.id,
      checkout_session_id: session.id,
      action: "checkout_quarantined",
      result: "quarantined",
      error_code: check.reason,
      error_message: check.reason,
      metadata: md,
    });
    return { quarantine: true, reason: check.reason };
  }

  const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!paid) {
    await auditRow(sb, {
      stripe_event_id: event.id,
      checkout_session_id: session.id,
      action: "checkout_unpaid",
      result: "ignored",
      error_code: "payment_status_not_paid",
      metadata: md,
    });
    return { action: "checkout_unpaid" };
  }

  const contractorId = md.contractor_id || md.contractor_profile_id || null;
  const prospectId = md.prospect_id || null;
  const planCode = md.plan_code || null;
  const offerCode = md.offer_code || null;
  const activationType = md.activation_type || null;

  if (contractorId) {
    // Persist stripe identifiers on the contractor and mark activated.
    const updates: Record<string, unknown> = {
      stripe_customer_id: session.customer,
      updated_at: new Date().toISOString(),
    };
    if (session.subscription) updates.stripe_subscription_id = session.subscription;
    if (planCode) updates.current_plan_code = planCode;
    updates.activation_status = "activated";
    updates.activated_at = new Date().toISOString();

    await sb
      .from("contractors")
      .update(updates)
      .eq("id", contractorId);

    // Prospect status.
    if (prospectId) {
      await sb
        .from("contractor_prospects")
        .update({ status: "activated", activated_at: new Date().toISOString() })
        .eq("id", prospectId);
    }
  }

  // The live acquisition pool lives in verified_contractor_prospects — mark it
  // paid even when no contractor record exists yet (outreach-driven activation).
  if (prospectId) {
    await sb
      .from("verified_contractor_prospects")
      .update({
        outreach_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospectId);
  }


  await auditRow(sb, {
    contractor_id: contractorId,
    prospect_id: prospectId,
    stripe_event_id: event.id,
    checkout_session_id: session.id,
    payment_intent_id: (session.payment_intent as string) || null,
    subscription_id: (session.subscription as string) || null,
    action: offerCode === "contractor_activation_1_dollar" ? "dollar_activation" : "checkout_completed",
    new_status: "activated",
    amount_cents: session.amount_total ?? null,
    currency: session.currency ?? null,
    source: md.source || null,
    campaign_id: md.campaign_id || null,
    result: "success",
    metadata: { plan_code: planCode, offer_code: offerCode, activation_type: activationType, ...md },
  });

  return { action: "checkout_completed", contractor_id: contractorId };
}

async function handleCheckoutFailed(sb: any, event: Stripe.Event): Promise<HandleResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  const md = (session.metadata ?? {}) as Record<string, string>;
  await auditRow(sb, {
    contractor_id: md.contractor_id || null,
    prospect_id: md.prospect_id || null,
    stripe_event_id: event.id,
    checkout_session_id: session.id,
    action: event.type,
    result: "failed",
    metadata: md,
  });
  return { action: event.type };
}

async function handleSubscriptionEvent(sb: any, event: Stripe.Event): Promise<HandleResult> {
  const sub = event.data.object as Stripe.Subscription;
  const md = (sub.metadata ?? {}) as Record<string, string>;
  const contractorId = md.contractor_id || null;
  const unproStatus = mapStripeSubscriptionStatus(sub.status);
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;

  await auditRow(sb, {
    contractor_id: contractorId,
    stripe_event_id: event.id,
    subscription_id: sub.id,
    action: event.type,
    new_status: unproStatus,
    metadata: {
      stripe_status: sub.status,
      price_id: priceId,
      current_period_end: (sub as any).current_period_end,
      cancel_at: (sub as any).cancel_at,
      ...md,
    },
    result: "success",
  });

  if (contractorId) {
    await sb.from("contractors").update({
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer,
      subscription_status: unproStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", contractorId);
  }

  return { action: event.type, contractor_id: contractorId, unpro_status: unproStatus };
}

async function handleInvoiceEvent(sb: any, event: Stripe.Event): Promise<HandleResult> {
  const inv = event.data.object as Stripe.Invoice;
  const md = (inv.metadata ?? {}) as Record<string, string>;
  await auditRow(sb, {
    contractor_id: md.contractor_id || null,
    stripe_event_id: event.id,
    subscription_id: (inv.subscription as string) || null,
    action: event.type,
    amount_cents: inv.amount_paid ?? inv.amount_due ?? null,
    currency: inv.currency ?? null,
    result: event.type === "invoice.paid" ? "success" : "failed",
    metadata: md,
  });
  return { action: event.type };
}

async function handlePaymentIntentEvent(sb: any, event: Stripe.Event): Promise<HandleResult> {
  const pi = event.data.object as Stripe.PaymentIntent;
  const md = (pi.metadata ?? {}) as Record<string, string>;
  await auditRow(sb, {
    contractor_id: md.contractor_id || null,
    stripe_event_id: event.id,
    payment_intent_id: pi.id,
    action: event.type,
    amount_cents: pi.amount_received ?? pi.amount ?? null,
    currency: pi.currency ?? null,
    result: event.type === "payment_intent.succeeded" ? "success" : "failed",
    metadata: md,
  });
  return { action: event.type };
}

async function handleChargeEvent(sb: any, event: Stripe.Event): Promise<HandleResult> {
  const ch = event.data.object as any;
  const md = (ch.metadata ?? {}) as Record<string, string>;
  await auditRow(sb, {
    contractor_id: md.contractor_id || null,
    stripe_event_id: event.id,
    payment_intent_id: ch.payment_intent || null,
    action: event.type,
    amount_cents: ch.amount_refunded ?? ch.amount ?? null,
    currency: ch.currency ?? null,
    result: event.type === "charge.refunded" ? "refunded" : "disputed",
    metadata: md,
  });
  return { action: event.type };
}

async function auditRow(sb: any, row: Record<string, unknown>) {
  try {
    await sb.from("unpro_payment_activation_audit").insert(row);
  } catch (e) {
    console.error("[stripe-unpro-webhook] audit_insert_failed", (e as Error).message);
  }
}
