/**
 * useAlexRecoveryWatchdog — global anti-freeze watchdog.
 * Runs every 3s. Kills hung TTS/connecting_voice states and ensures Alex stays usable.
 */
import { useEffect } from "react";
import { useAlexStore } from "../state/alexStore";
import {
  hardResetAlexSession,
  switchAlexToChatFallback,
  ALEX_FROZEN_MS,
} from "../services/alexHardRecovery";
import { alexLog } from "../utils/alexDebug";

export function useAlexRecoveryWatchdog() {
  useEffect(() => {
    const tick = () => {
      const s = useAlexStore.getState();
      const now = Date.now();
      const last = s.lastTTSActivityAt ?? 0;
      const stuck =
        (s.hasActiveTTSRequest || s.mode === "connecting_voice") &&
        last > 0 &&
        now - last > ALEX_FROZEN_MS;
      if (stuck) {
        alexLog("watchdog:ALEX_FROZEN_AUTO_RECOVERY", { age: now - last });
        switchAlexToChatFallback(
          "tts_watchdog_frozen",
          "La voix d'Alex est temporairement indisponible. Je continue ici.",
        );
      }
    };
    const id = window.setInterval(tick, 3000);
    return () => window.clearInterval(id);
  }, []);

  // Mobile/Android: app returns to foreground with broken audio → reset clean
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const s = useAlexStore.getState();
      if (s.hasActiveTTSRequest || s.mode === "connecting_voice") {
        alexLog("watchdog:visibility_resume_reset");
        hardResetAlexSession("visibility_resume");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
}
