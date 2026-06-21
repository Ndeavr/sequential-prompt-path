/**
 * UNPRO — Scroll & interaction lock for auth overlay
 * Idempotent unlock: always clears the inline overflow so a stale "hidden"
 * from a previous instance can never persist and break sitewide scrolling.
 */
import { useEffect } from "react";

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [locked]);
}
