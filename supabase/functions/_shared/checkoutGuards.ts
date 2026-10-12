// Pure guards shared by checkout + webhook (no Deno APIs: unit-tested in vitest).

const ALLOWED_HOSTS = new Set([
  "unpro.ca", "www.unpro.ca", "app.unpro.ca", "unpro.lovable.app",
  "id-preview--ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovable.app",
  "ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovableproject.com",
]);

/** Only our own origins may receive the Stripe redirect (no open redirect). */
export function safeRedirectUrl(url: unknown, fallback: string): string {
  if (typeof url !== "string" || !url) return fallback;
  try {
    const u = new URL(url);
    const local = u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
    if (local || (u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname.toLowerCase()))) return url;
  } catch { /* invalid */ }
  return fallback;
}

export interface WebhookEventRow { processing_status?: string | null; received_at?: string | null }

/**
 * A redelivered event is skipped only if it was already processed or is being
 * processed right now. A previous failed/stuck attempt must be retried,
 * otherwise a paid contractor is never activated.
 */
export function shouldSkipRedelivery(row: WebhookEventRow | null, nowMs = Date.now()): boolean {
  if (!row) return true; // unknown state: keep historical behaviour
  const s = row.processing_status ?? "";
  if (s === "processed" || s === "ignored" || s === "ignored_unpaid" || s === "success") return true;
  if (s === "processing") {
    const t = row.received_at ? Date.parse(row.received_at) : nowMs;
    return nowMs - t < 5 * 60_000;
  }
  return false;
}

/** Session paid states that may drive activation (never the return URL). */
export function isSessionPaid(s: { payment_status?: string | null; status?: string | null }): boolean {
  return s.payment_status === "paid" || s.payment_status === "no_payment_required";
}

/** Strict Stripe Checkout Session id format (cs_test_… / cs_live_…). */
export function isValidCheckoutSessionId(v: unknown): v is string {
  return typeof v === "string" && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(v);
}

export interface SessionLike {
  livemode?: boolean | null;
  mode?: string | null;
  currency?: string | null;
  amount_subtotal?: number | null;
  metadata?: Record<string, string> | null;
}

/**
 * Why a Stripe session must NOT confirm this quote (null = consistent).
 * Wrong quote/account, test/live mix, and for the 350 $ entry activation:
 * one-time payment, CAD, exactly 35 000 cents before taxes.
 */
export function sessionMismatch(s: SessionLike, ctx: { quoteId: string; userId: string; testKey: boolean }): string | null {
  const m = s.metadata ?? {};
  if (m.quote_id !== ctx.quoteId) return "quote_mismatch";
  if (m.user_id && m.user_id !== ctx.userId) return "user_mismatch";
  if (!!s.livemode === ctx.testKey) return "livemode_mismatch";
  if (m.offer === "entry_activation_350") {
    if (s.mode !== "payment") return "mode_mismatch";
    if ((s.currency ?? "").toLowerCase() !== "cad") return "currency_mismatch";
    if (s.amount_subtotal !== 35000) return "amount_mismatch";
  }
  return null;
}

/** Client-side: the return page may only start confirming with a real session id. */
export function returnConfirmationMode(search: string): "none" | "confirm" | "canceled" | "invalid" {
  const p = new URLSearchParams(search);
  const outcome = p.get("checkout");
  if (outcome === "canceled") return "canceled";
  if (outcome !== "success") return "none";
  return isValidCheckoutSessionId(p.get("session_id")) ? "confirm" : "invalid";
}
