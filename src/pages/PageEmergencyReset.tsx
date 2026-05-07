/**
 * UNPRO — Emergency Reset
 * Clears stuck overlay state, alex/copilot caches, and bounces home.
 * Does NOT touch auth session.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import { useAlexChatFallbackStore } from "@/stores/alexChatFallbackStore";

export default function PageEmergencyReset() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      useAlexVoiceLockedStore.getState().closeVoiceSession?.("emergency_reset");
    } catch { /* noop */ }
    try {
      useAlexChatFallbackStore.getState().close?.();
    } catch { /* noop */ }
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^(unpro_onboarding_|alex_|copilot_|unpro_prelogin_)/i.test(k)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem("unpro_prelogin_role");
    } catch { /* noop */ }
    try { window.dispatchEvent(new CustomEvent("alex-voice-cleanup")); } catch { /* noop */ }

    const t = setTimeout(() => navigate("/", { replace: true }), 350);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-sm text-muted-foreground animate-pulse">Réinitialisation…</div>
    </div>
  );
}
