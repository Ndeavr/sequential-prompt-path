import { supabase } from "@/integrations/supabase/client";

/** Asks the server to reconcile a quote with Stripe. True only if server says paid. */
export async function reconcileQuotePayment(quoteId: string): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke("create-checkout-session", {
      body: { action: "reconcile", quoteId },
    });
    return (data as { status?: string } | null)?.status === "paid";
  } catch {
    return false;
  }
}

/**
 * Stripe return URL that keeps attribution (t, ref, offer, utm…) so a cancel
 * then retry is still attributed to the original prospect link.
 */
export function planReturnUrl(origin: string, quoteId: string, search: string, outcome: "success" | "canceled"): string {
  const p = new URLSearchParams(search);
  p.delete("checkout");
  p.set("checkout", outcome);
  return `${origin}/entrepreneur/plan-personnalise/${quoteId}?${p.toString()}`;
}
