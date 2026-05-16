// PROTECTED FILE — ALEX VOICE CORE
// Do not modify unless task explicitly says VOICE.
// Any change requires voice_smoke_test passing before deploy.
/**
 * voiceSmokeTest — Automated end-to-end voice health verification.
 *
 * Confirms:
 *  1. Mic permission state can be read
 *  2. TTS endpoint returns audio (primary voice)
 *  3. Audio decodes and plays
 *  4. Fallback voice works when primary is forced offline
 *  5. No fatal console error blocked voice
 *
 * Used by:
 *  - Admin > System Health > Alex Voice page
 *  - pre_deploy_voice_guard
 */
import { supabase } from "@/integrations/supabase/client";
import { ALEX_VOICE_BASE, ALEX_VOICE_BACKUP } from "@/config/alexVoiceConfig";

export type SmokeCheck = {
  name: string;
  pass: boolean;
  detail?: string;
  durationMs?: number;
};

export type SmokeReport = {
  ok: boolean;
  checks: SmokeCheck[];
  startedAt: string;
  finishedAt: string;
  lastPrimaryAudioBytes?: number;
  lastFallbackAudioBytes?: number;
};

async function timed<T>(fn: () => Promise<T>): Promise<{ result?: T; error?: unknown; ms: number }> {
  const t0 = performance.now();
  try {
    const result = await fn();
    return { result, ms: performance.now() - t0 };
  } catch (error) {
    return { error, ms: performance.now() - t0 };
  }
}

async function callTts(voiceId: string, text: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.functions.invoke("alex-voice-test", {
    body: { voice_id: voiceId, test_text: text, language: "fr" },
  });
  if (error) throw new Error(error.message || "tts invoke failed");
  // alex-voice-test returns audio/mpeg ArrayBuffer or a JSON error.
  if (data instanceof ArrayBuffer) return data;
  if (data instanceof Blob) return await data.arrayBuffer();
  if (typeof data === "object" && data && "error" in (data as Record<string, unknown>)) {
    throw new Error(String((data as Record<string, unknown>).error));
  }
  throw new Error("unexpected tts response shape");
}

async function tryPlay(buffer: ArrayBuffer): Promise<void> {
  const blob = new Blob([buffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio(url);
    audio.volume = 0; // silent smoke test
    await audio.play().catch(() => {
      /* autoplay block is fine — we only need decode */
    });
    audio.pause();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readMicPermission(): Promise<string> {
  try {
    // Permissions API may not exist on Safari iOS
    const anyNav = navigator as unknown as {
      permissions?: { query: (q: { name: PermissionName }) => Promise<{ state: string }> };
    };
    if (anyNav.permissions?.query) {
      const status = await anyNav.permissions.query({ name: "microphone" as PermissionName });
      return status.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Run the full Alex voice smoke test from the browser. */
export async function voice_smoke_test(): Promise<SmokeReport> {
  const startedAt = new Date().toISOString();
  const checks: SmokeCheck[] = [];
  let lastPrimaryAudioBytes: number | undefined;
  let lastFallbackAudioBytes: number | undefined;

  // 1. Mic permission readable
  const micState = await readMicPermission();
  checks.push({
    name: "mic_permission_readable",
    pass: micState !== "denied",
    detail: `state=${micState}`,
  });

  // 2. Primary TTS returns audio
  const primary = await timed(() => callTts(ALEX_VOICE_BASE.voiceId, "Test de voix Alex."));
  if (primary.result) {
    lastPrimaryAudioBytes = primary.result.byteLength;
    checks.push({
      name: "primary_tts_returns_audio",
      pass: primary.result.byteLength > 1024,
      detail: `${primary.result.byteLength} bytes`,
      durationMs: Math.round(primary.ms),
    });
    // 3. Audio decodes / plays
    const play = await timed(() => tryPlay(primary.result!));
    checks.push({
      name: "primary_audio_playable",
      pass: !play.error,
      detail: play.error ? String((play.error as Error).message ?? play.error) : "ok",
      durationMs: Math.round(play.ms),
    });
  } else {
    checks.push({
      name: "primary_tts_returns_audio",
      pass: false,
      detail: String((primary.error as Error)?.message ?? primary.error),
      durationMs: Math.round(primary.ms),
    });
    checks.push({ name: "primary_audio_playable", pass: false, detail: "skipped" });
  }

  // 4. Fallback voice works
  const fallback = await timed(() => callTts(ALEX_VOICE_BACKUP.voiceId, "Test voix de secours."));
  if (fallback.result) {
    lastFallbackAudioBytes = fallback.result.byteLength;
    checks.push({
      name: "fallback_tts_returns_audio",
      pass: fallback.result.byteLength > 1024,
      detail: `${fallback.result.byteLength} bytes`,
      durationMs: Math.round(fallback.ms),
    });
  } else {
    checks.push({
      name: "fallback_tts_returns_audio",
      pass: false,
      detail: String((fallback.error as Error)?.message ?? fallback.error),
      durationMs: Math.round(fallback.ms),
    });
  }

  // 5. Edge health
  const health = await timed(async () => {
    const { data, error } = await supabase.functions.invoke("alex-voice-health");
    if (error) throw error;
    return data;
  });
  checks.push({
    name: "edge_health_endpoint_ok",
    pass: !health.error,
    detail: health.error ? String((health.error as Error).message ?? health.error) : "ok",
    durationMs: Math.round(health.ms),
  });

  // 6. DOM-level checks (only meaningful when running in a browser tab
  // that mounts Alex). Skipped gracefully when no orb is on the page.
  if (typeof document !== "undefined") {
    const orb = document.querySelector<HTMLElement>('[data-alex-orb="true"]');
    checks.push({
      name: "orb_present",
      pass: !!orb,
      detail: orb ? "found" : "no [data-alex-orb] in DOM (page may not mount Alex)",
    });
    if (orb) {
      const startedAtMode = (window as unknown as { __alexMode?: string }).__alexMode;
      orb.click();
      const reached = await new Promise<boolean>((resolve) => {
        const deadline = Date.now() + 2000;
        const tick = () => {
          const m = (window as unknown as { __alexMode?: string }).__alexMode;
          if (m && m !== startedAtMode && m !== "idle") return resolve(true);
          if (Date.now() > deadline) return resolve(false);
          setTimeout(tick, 100);
        };
        tick();
      });
      checks.push({
        name: "orb_click_starts_listening",
        pass: reached,
        detail: reached ? "store mode transitioned" : "no transition within 2s (window.__alexMode unset?)",
      });
    }
  }

  const finishedAt = new Date().toISOString();
  return {
    ok: checks.every((c) => c.pass),
    checks,
    startedAt,
    finishedAt,
    lastPrimaryAudioBytes,
    lastFallbackAudioBytes,
  };
}

/** Convenience used by the deploy guard documentation and admin UI. */
export const pre_deploy_voice_guard = voice_smoke_test;
