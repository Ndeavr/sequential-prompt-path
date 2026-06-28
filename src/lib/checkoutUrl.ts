/**
 * UNPRO — Checkout URL builder
 * Single source of truth for navigating to /entrepreneur/checkout.
 *
 * Always propagates the active `quoteId` (read from sessionStorage when not
 * provided explicitly), so the personalized pricing quote drives:
 *  - the displayed plan/price
 *  - the "Recommended vs Applied" downgrade banner
 *  - the Stripe checkout amount
 *
 * Use everywhere instead of hard-coded "/entrepreneur/checkout?..." strings.
 */

const QUOTE_ID_KEY = "unpro_active_quote_id";

export function setActiveQuoteId(quoteId: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (quoteId) sessionStorage.setItem(QUOTE_ID_KEY, quoteId);
  } catch {
    /* ignore */
  }
}

export function getActiveQuoteId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(QUOTE_ID_KEY);
  } catch {
    return null;
  }
}

export function buildCheckoutUrl(opts?: {
  plan?: string | null;
  quoteId?: string | null;
  recommendation?: string | null;
}): string {
  const qid = opts?.quoteId ?? getActiveQuoteId();
  const params = new URLSearchParams();
  if (qid) params.set("quoteId", qid);
  if (opts?.plan) params.set("plan", opts.plan);
  if (opts?.recommendation) params.set("recommendation", opts.recommendation);
  const qs = params.toString();
  return `/entrepreneur/checkout${qs ? `?${qs}` : ""}`;
}
