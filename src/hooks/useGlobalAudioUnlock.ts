/**
 * useGlobalAudioUnlock — Preloads a silent AudioContext on first user tap.
 * 
 * Mobile browsers (Android/iOS) block audio until a user gesture.
 * This hook creates and resumes an AudioContext on the very first
 * tap/click, so subsequent voice sessions start instantly.
 * 
 * Mount ONCE at app root level.
 */
import { useEffect } from "react";

let unlocked = false;
let sharedCtx: AudioContext | null = null;

function unlockAudio() {
  if (unlocked) return;
  unlocked = true;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    sharedCtx = new AudioCtx();

    // Play a silent buffer to fully unlock on iOS/Android
    const buffer = sharedCtx.createBuffer(1, 1, 22050);
    const source = sharedCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(sharedCtx.destination);
    source.start(0);

    // Resume if suspended (Chrome policy)
    if (sharedCtx.state === "suspended") {
      sharedCtx.resume();
    }

    console.log("[AudioUnlock] ✅ Audio unlocked on first interaction");
  } catch (e) {
    console.warn("[AudioUnlock] Failed to unlock:", e);
  }
}

export function useGlobalAudioUnlock() {
  useEffect(() => {
    if (unlocked) return;

    const handler = () => unlockAudio();
    window.addEventListener("click", handler, { once: true, capture: true });
    window.addEventListener("touchstart", handler, { once: true, capture: true });

    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);
}

export function isAudioUnlocked() {
  return unlocked;
}
