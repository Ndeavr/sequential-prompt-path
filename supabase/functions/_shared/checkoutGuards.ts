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
