/**
 * AlexVoiceDiagnosticsPanel — Realtime diagnostics for Alex Voice.
 * Visible when URL contains ?alexdebug=true (no auth gate).
 */
import { useEffect, useState } from "react";
import { useAlexVoiceServiceSnapshot } from "@/services/alexVoiceService";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import { ALEX_VOICE_BASE } from "@/config/alexVoiceConfig";

const Row = ({ label, value, ok }: { label: string; value: string; ok?: boolean | null }) => (
  <div className="flex items-center justify-between gap-3 text-[11px] py-0.5">
    <span className="text-muted-foreground">{label}</span>
    <span
      className={
        ok === true
          ? "text-emerald-400 font-mono"
          : ok === false
          ? "text-rose-400 font-mono"
          : "text-foreground font-mono"
      }
    >
      {value}
    </span>
  </div>
);

export default function AlexVoiceDiagnosticsPanel() {
  const [enabled, setEnabled] = useState(false);
  const snap = useAlexVoiceServiceSnapshot();
  const locked = useAlexVoiceLockedStore();
  const [bootMs, setBootMs] = useState(0);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setEnabled(url.searchParams.get("alexdebug") === "true");
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setBootMs((m) => m + 250), 250);
    return () => clearInterval(t);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[10001] w-[280px] rounded-xl border border-border/50 bg-background/95 backdrop-blur px-3 py-2 shadow-lg pointer-events-auto">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
        Alex Voice Diagnostics
      </div>
      <Row label="state" value={snap.state} />
      <Row label="machine" value={(locked as any).machineState ?? "—"} />
      <Row label="overlay" value={locked.isOverlayOpen ? "open" : "closed"} ok={locked.isOverlayOpen} />
      <Row label="voice id" value={ALEX_VOICE_BASE.voiceId.slice(0, 10) + "…"} />
      <Row label="model" value={ALEX_VOICE_BASE.modelId} />
      <Row label="api key" value={snap.apiKeyConfigured == null ? "?" : snap.apiKeyConfigured ? "yes" : "no"} ok={snap.apiKeyConfigured} />
      <Row label="signed url" value={snap.tokenReceived ? "yes" : "no"} ok={snap.tokenReceived} />
      <Row label="ws connected" value={snap.wsConnected ? "yes" : "no"} ok={snap.wsConnected} />
      <Row label="mic" value={snap.micPermission} ok={snap.micPermission === "granted" ? true : snap.micPermission === "denied" ? false : null} />
      <Row label="mic active" value={snap.microphoneActive ? "active" : "inactive"} ok={snap.microphoneActive} />
      <Row label="input level" value={`${snap.inputLevel}%`} ok={snap.inputLevel > 1 ? true : null} />
      <Row label="vad" value={snap.vadState} ok={snap.vadState === "speech_detected" ? true : null} />
      <Row label="tts" value={snap.ttsState} ok={snap.ttsState === "speaking" ? true : null} />
      <Row label="asr" value={snap.asrReceivingAudio ? "receiving" : "no audio"} ok={snap.asrReceivingAudio} />
      <Row label="upload" value={snap.imageUploadState} ok={snap.imageUploadState === "success" ? true : snap.imageUploadState === "error" ? false : null} />
      <Row label="voice" value={snap.currentVoiceGender} ok={snap.currentVoiceGender === "female" || snap.currentVoiceGender === "male" ? true : null} />
      <Row label="audio unlocked" value={snap.audioUnlocked ? "yes" : "no"} ok={snap.audioUnlocked} />
      <Row label="retry" value={String(snap.retryCount)} />
      <Row label="latency" value={snap.latencyMs != null ? `${snap.latencyMs}ms` : "—"} />
      <Row label="uptime" value={`${Math.floor(bootMs / 1000)}s`} />
      {snap.lastError && (
        <div className="mt-1.5 pt-1.5 border-t border-border/30 text-[10px] text-rose-400 font-mono break-words">
          {snap.lastError}
        </div>
      )}
    </div>
  );
}
