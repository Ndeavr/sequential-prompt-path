import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type VerificationStep =
  | "idle"
  | "checking_health"
  | "importing"
  | "creating_checkout"
  | "awaiting_payment"
  | "verifying_payment"
  | "complete"
  | "error";

export interface VerificationState {
  step: VerificationStep;
  health: {
    connected: boolean;
    livemode: boolean;
    account_id?: string;
  } | null;
  contractor: {
    id: string;
    business_name: string;
    domain: string;
    category: string;
  } | null;
  checkout: {
    url: string;
    session_id: string;
    customer_id: string;
    coupon_id: string;
    amount_charged: number;
  } | null;
  payment: {
    status: string;
    payment_status: string;
    subscription_id?: string;
    amount_total?: number;
  } | null;
  error: string | null;
}

const initialState: VerificationState = {
  step: "idle",
  health: null,
  contractor: null,
  checkout: null,
  payment: null,
  error: null,
};

async function invoke(action: string, extra?: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("stripe-live-verification", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useStripeLiveVerification() {
  const [state, setState] = useState<VerificationState>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const checkHealth = useCallback(async () => {
    setState((s) => ({ ...s, step: "checking_health", error: null }));
    try {
      const data = await invoke("health");
      setState((s) => ({ ...s, health: data, step: data.connected ? s.step : "error", error: data.connected ? null : "Stripe non connecté" }));
      return data.connected;
    } catch (e: any) {
      setState((s) => ({ ...s, step: "error", error: e.message }));
      return false;
    }
  }, []);

  const importContractor = useCallback(async () => {
    setState((s) => ({ ...s, step: "importing", error: null }));
    try {
      const data = await invoke("import-contractor");
      setState((s) => ({ ...s, contractor: data }));
      return data;
    } catch (e: any) {
      setState((s) => ({ ...s, step: "error", error: e.message }));
      return null;
    }
  }, []);

  const createCheckout = useCallback(async (contractorId: string) => {
    setState((s) => ({ ...s, step: "creating_checkout", error: null }));
    try {
      const data = await invoke("create-checkout", { contractor_id: contractorId });
      setState((s) => ({ ...s, checkout: data, step: "awaiting_payment" }));
      return data;
    } catch (e: any) {
      setState((s) => ({ ...s, step: "error", error: e.message }));
      return null;
    }
  }, []);

  const verifyPayment = useCallback(async (sessionId: string) => {
    setState((s) => ({ ...s, step: "verifying_payment", error: null }));
    try {
      const data = await invoke("verify-payment", { session_id: sessionId });
      setState((s) => ({
        ...s,
        payment: data,
        step: data.payment_status === "paid" ? "complete" : "error",
        error: data.payment_status === "paid" ? null : "Paiement non confirmé",
      }));
      return data;
    } catch (e: any) {
      setState((s) => ({ ...s, step: "error", error: e.message }));
      return null;
    }
  }, []);

  const runFullFlow = useCallback(async () => {
    const healthy = await checkHealth();
    if (!healthy) return;

    const contractor = await importContractor();
    if (!contractor) return;

    const checkout = await createCheckout(contractor.contractor_id);
    if (!checkout) return;

    // Open checkout in new tab
    window.open(checkout.checkout_url, "_blank");
  }, [checkHealth, importContractor, createCheckout]);

  return { state, setState, reset, checkHealth, importContractor, createCheckout, verifyPayment, runFullFlow };
}

export function useWebhookEvents() {
  return useQuery({
    queryKey: ["stripe-webhook-events"],
    queryFn: async () => {
      const data = await invoke("check-webhooks");
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useCheckoutSessions() {
  return useQuery({
    queryKey: ["billing-checkout-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_checkout_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });
}
