/**
 * OverlayHydrationGuard — Failsafe to clear stuck Alex overlays after a rollback or reload.
 *
 * On every full page load:
 *  - If `?reset=1` is present, force-close all overlay stores.
 *  - 2.5s after mount, if any overlay is still open AND no real voice session is active,
 *    close them so the underlying page becomes interactive.
 *  - Also runs on `pageshow` (bfcache restore).
 */
import { useEffect } from "react";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import { useAlexChatFallbackStore } from "@/stores/alexChatFallbackStore";

function clearStuckOverlays(reason: string) {
  try {
    const v = useAlexVoiceLockedStore.getState();
    const state = (v as any).machineState;
    const isLive = ["session_ready", "listening", "capturing_voice", "processing_stt", "processing_response", "speaking", "awaiting_user"].includes(state);
    if (v.isOverlayOpen && !isLive) {
      v.closeVoiceSession?.(reason);
    }
  } catch { /* noop */ }
  try {
    const c = useAlexChatFallbackStore.getState();
    if (c.isOpen) c.close?.();
  } catch { /* noop */ }
}

export default function OverlayHydrationGuard() {
  useEffect(() => {
    // Reset query param escape hatch
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("reset") === "1") {
        clearStuckOverlays("query_reset");
        url.searchParams.delete("reset");
        window.history.replaceState({}, "", url.toString());
      }
    } catch { /* noop */ }

    // Watchdog: if 2.5s after load nothing live, drop overlays
    const t = setTimeout(() => clearStuckOverlays("hydration_watchdog"), 2500);

    const onShow = (e: PageTransitionEvent) => {
      if ((e as any).persisted) clearStuckOverlays("bfcache_restore");
    };
    window.addEventListener("pageshow", onShow);

    return () => {
      clearTimeout(t);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  return null;
}
