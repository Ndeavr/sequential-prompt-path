// Shared helpers for the UNPRO Stripe webhook + reconciliation flow.
// Do NOT import ISR-specific code here.

export const UNPRO_STRIPE_ACCOUNT_ID = "acct_19AhHrCvZwK1QnPV";

export const UNPRO_WEBHOOK_URL_PATH = "/functions/v1/stripe-unpro-webhook";

export const UNPRO_SUPPORTED_EVENTS = new Set<string>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "charge.refunded",
  "charge.dispute.created",
]);

export type UnproAccessStatus =
  | "trial_active"
  | "active"
  | "payment_incomplete"
  | "activation_failed"
  | "past_due"
  | "suspended_payment"
  | "paused"
  | "canceled";

export function mapStripeSubscriptionStatus(status: string | null | undefined): UnproAccessStatus {
  switch (status) {
    case "trialing": return "trial_active";
    case "active": return "active";
    case "incomplete": return "payment_incomplete";
    case "incomplete_expired": return "activation_failed";
    case "past_due": return "past_due";
    case "unpaid": return "suspended_payment";
    case "paused": return "paused";
    case "canceled": return "canceled";
    default: return "activation_failed";
  }
}

export interface UnproMetadataCheck {
  ok: boolean;
  reason?: string;
  quarantine?: boolean; // true = ignored + admin alert (ISR contamination)
}

export function checkUnproMetadata(md: Record<string, string> | null | undefined): UnproMetadataCheck {
  const m = md || {};
  // Reject ISR contamination
  if (String(m.platform || "").toLowerCase() === "isr" || String(m.brand || "").toLowerCase() === "isr") {
    return { ok: false, quarantine: true, reason: "isr_metadata_detected" };
  }
  if (!m.platform || String(m.platform).toLowerCase() !== "unpro") {
    return { ok: false, reason: "missing_platform_unpro" };
  }
  if (!m.brand || String(m.brand).toLowerCase() !== "unpro") {
    return { ok: false, reason: "missing_brand_unpro" };
  }
  return { ok: true };
}

export function extractObjectId(evt: any): string | null {
  return evt?.data?.object?.id ?? null;
}
