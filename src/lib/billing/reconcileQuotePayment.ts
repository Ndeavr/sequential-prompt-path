import { supabase } from "@/integrations/supabase/client";

export type ReconcileStatus =
  | "paid" | "open" | "unpaid" | "expired" | "no_session" | "invalid_session"
  | "webhook_pending" | "pending" | "confirmation_failed" | "error";

/** Asks the server to reconcile a quote with Stripe. Status always comes from the server. */
export async function reconcileQuoteStatus(quoteId: string, sessionId?: string | null): Promise<ReconcileStatus> {
  try {
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { action: "reconcile", quoteId, ...(sessionId ? { sessionId } : {}) },
    });
    if (error) return "error";
    return ((data as { status?: ReconcileStatus } | null)?.status) ?? "error";
  } catch {
    return "error";
  }
}

/** True only if server says paid. */
export async function reconcileQuotePayment(quoteId: string, sessionId?: string | null): Promise<boolean> {
  return (await reconcileQuoteStatus(quoteId, sessionId)) === "paid";
}

/**
 * Stripe return URL that keeps attribution (t, ref, offer, utm…) so a cancel
 * then retry is still attributed to the original prospect link. The success
 * URL carries Stripe's real session id: without it, nothing is confirmed.
 */
export function planReturnUrl(origin: string, quoteId: string, search: string, outcome: "success" | "canceled"): string {
  const p = new URLSearchParams(search);
  p.delete("checkout");
  p.delete("session_id");
  p.set("checkout", outcome);
  const base = `${origin}/entrepreneur/plan-personnalise/${quoteId}?${p.toString()}`;
  return outcome === "success" ? `${base}&session_id={CHECKOUT_SESSION_ID}` : base;
}
