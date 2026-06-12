/**
 * AuthGateMount — global mount + first-intent listener.
 *
 * Listens to `alex-intent-change` (already emitted by useIntentCTA when Alex
 * captures an intent) and opens the AuthGateCard once per session.
 */
import { useEffect } from "react";
import AuthGateCard from "@/components/auth/AuthGateCard";
import { useAuthGate } from "@/hooks/useAuthGate";

const FIRST_INTENT_FIRED_KEY = "unpro_auth_gate_first_intent_fired";

export default function AuthGateMount() {
  const { requestLoginPrompt, isAuthenticated } = useAuthGate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuthenticated) return;

    const onIntent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      try {
        if (sessionStorage.getItem(FIRST_INTENT_FIRED_KEY) === "1") return;
        sessionStorage.setItem(FIRST_INTENT_FIRED_KEY, "1");
      } catch {}
      // Small delay so the card appears after Alex's confirming line.
      setTimeout(() => requestLoginPrompt("first_intent"), 900);
    };

    window.addEventListener("alex-intent-change", onIntent as EventListener);
    return () => window.removeEventListener("alex-intent-change", onIntent as EventListener);
  }, [requestLoginPrompt, isAuthenticated]);

  return <AuthGateCard />;
}
