/**
 * AlexVoiceDebugPanel — Admin-only floating debug panel for Alex Voice.
 */
import { useAlexVoiceServiceSnapshot } from "@/services/alexVoiceService";
import { useAuth } from "@/hooks/useAuth";

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

export default function AlexVoiceDebugPanel() {
  const { user } = useAuth();
  const snap = useAlexVoiceServiceSnapshot();

  // Heuristic admin check — extend as project requires.
  const isAdmin =
    Boolean((user as any)?.app_metadata?.is_admin) ||
    Boolean((user as any)?.user_metadata?.is_admin) ||
    user?.email?.endsWith("@unpro.ca");

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[10001] w-[260px] rounded-xl border border-border/50 bg-background/95 backdrop-blur px-3 py-2 shadow-lg pointer-events-auto">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
        Alex Voice Debug
      </div>
      <Row label="state" value={snap.state} />
      <Row
        label="api key"
        value={snap.apiKeyConfigured == null ? "?" : snap.apiKeyConfigured ? "yes" : "no"}
        ok={snap.apiKeyConfigured}
      />
      <Row label="signed url" value={snap.tokenReceived ? "yes" : "no"} ok={snap.tokenReceived} />
      <Row label="ws connected" value={snap.wsConnected ? "yes" : "no"} ok={snap.wsConnected} />
      <Row
        label="mic"
        value={snap.micPermission}
        ok={snap.micPermission === "granted" ? true : snap.micPermission === "denied" ? false : null}
      />
      <Row label="audio unlocked" value={snap.audioUnlocked ? "yes" : "no"} ok={snap.audioUnlocked} />
      <Row label="retry" value={String(snap.retryCount)} />
      <Row label="latency" value={snap.latencyMs != null ? `${snap.latencyMs}ms` : "—"} />
      {snap.lastError && (
        <div className="mt-1.5 pt-1.5 border-t border-border/30 text-[10px] text-rose-400 font-mono break-words">
          {snap.lastError}
        </div>
      )}
    </div>
  );
}
