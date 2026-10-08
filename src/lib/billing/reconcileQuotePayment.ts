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
