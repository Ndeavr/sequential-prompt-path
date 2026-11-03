/**
 * Conservative LIVE Stripe evidence for the admin follow-up card, not the
 * authoritative 3,000-business sales/revenue reconciliation. A ledger row,
 * subscription flag or unmatched/unprocessed event alone proves no payment.
 */
import { addCalendarMonths } from "../../../../supabase/functions/_shared/checkoutGuards";
export type SubRow = { contractor_id: string; status: string; stripe_subscription_id: string | null; created_at: string };
export type LedgerRow = { contractor_id: string; action: string; source: string; created_at: string; metadata: Record<string, any> | null };
export type EventRow = { contractor_id: string | null; event_type: string; livemode: boolean | null; success: boolean | null; session_id: string | null; stripe_event_id: string; created_at: string; payload?: any };

export type Classification =
  | { kind: "live_paid"; source: "subscription" | "activation_350"; paid_at: string; new_lt_7d: boolean }
  | { kind: "excluded"; reason: "test_mode" | "no_stripe_proof" | "refunded_or_cancelled" | "expired" };

const PAID_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const REVERSAL_EVENTS = new Set(["charge.refunded", "charge.dispute.created", "customer.subscription.deleted"]);
const DAY = 86400000;

export function classifyContractor(
  id: string,
  subs: SubRow[],
  ledger: LedgerRow[],
  events: EventRow[],
  now = Date.now(),
): Classification {
  const ev = events.filter((e) => e.contractor_id === id);
  const live = ev.filter((e) => e.livemode === true);
  const reversed = live.some((e) => REVERSAL_EVENTS.has(e.event_type));

  // Require server-written boolean LIVE, full-price CAD 350 before taxes,
  // no discount, and the exact successfully finalized signed event/session.
  // Historical CRM flags and string "true" must not manufacture a paid 350.
  const paid350 = ledger
    .filter((l) => l.contractor_id === id &&
      l.action === "entry_activation_350_paid" &&
      l.source === "stripe_webhook" &&
      l.metadata?.livemode === true &&
      l.metadata?.amount_subtotal_cents === 35000 &&
      l.metadata?.amount_discount_cents === 0)
    .filter((l) => live.some((e) =>
      e.success === true &&
      e.stripe_event_id === l.metadata?.stripe_event_id &&
      e.session_id === l.metadata?.stripe_session_id &&
      PAID_EVENTS.has(e.event_type)))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  if (paid350) {
    const deactivated = ledger.some((l) => l.action === "deactivated" && l.source === "stripe_webhook" && l.metadata?.stripe_session_id === paid350.metadata?.stripe_session_id);
    if (deactivated || reversed) return { kind: "excluded", reason: "refunded_or_cancelled" };
    const t = Date.parse(paid350.created_at);
    if (!Number.isFinite(t) || addCalendarMonths(new Date(t), 12).getTime() <= now) return { kind: "excluded", reason: "expired" };
    return { kind: "live_paid", source: "activation_350", paid_at: paid350.created_at, new_lt_7d: now - t < 7 * DAY };
  }

  const sub = subs.find((s) => s.contractor_id === id && s.status === "active");
  const livePaid = live.filter((e) => PAID_EVENTS.has(e.event_type) && e.success !== false)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  if (sub && sub.stripe_subscription_id && livePaid) {
    if (reversed) return { kind: "excluded", reason: "refunded_or_cancelled" };
    const t = Date.parse(livePaid.created_at);
    return { kind: "live_paid", source: "subscription", paid_at: livePaid.created_at, new_lt_7d: now - t < 7 * DAY };
  }
  if (ev.length > 0 && live.length === 0) return { kind: "excluded", reason: "test_mode" };
  return { kind: "excluded", reason: "no_stripe_proof" };
}

/** Human-readable specialty (DB may hold JSON arrays/objects). */
export function formatSpecialty(v: unknown): string | null {
  if (v == null || v === "") return null;
  let x: unknown = v;
  if (typeof v === "string" && /^[[{"]/.test(v.trim())) {
    try { x = JSON.parse(v); } catch { return v; }
  }
  if (Array.isArray(x)) return x.map((i) => formatSpecialty(i)).filter(Boolean).join(", ") || null;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return String(o.label_fr ?? o.label ?? o.name ?? o.slug ?? Object.values(o).filter((s) => typeof s === "string").join(", "));
  }
  return String(x).replace(/[-_]/g, " ");
}
