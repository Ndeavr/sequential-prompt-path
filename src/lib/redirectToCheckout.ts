/**
 * redirectToCheckout — Safe navigation to Stripe Checkout (or any external URL)
 * that works inside iframes (Lovable preview, embeds) where the target page
 * sets X-Frame-Options: DENY.
 *
 * Strategy:
 *  1. Try to break out of the iframe via window.top.location.
 *  2. If that throws (cross-origin), open in a new tab.
 *  3. If the popup is blocked, fall back to same-window navigation.
 */
export function redirectToCheckout(url: string): void {
  if (!url) return;

  try {
    if (typeof window !== "undefined" && window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch {
    // cross-origin top → fall through to window.open
  }

  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) return;
  } catch {
    // popup blocked → fall through
  }

  window.location.href = url;
}
