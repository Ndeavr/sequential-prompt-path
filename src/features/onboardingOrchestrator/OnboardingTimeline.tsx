import { useContractorTimeline } from "./useContractorTimeline";
import { STATE_LABELS, STATE_COLOR, type OnboardingState } from "./index";
import { formatQcDateTime } from "@/lib/time/timezone";

const STEP_ORDER: OnboardingState[] = [
  "SCRAPED","VALIDATING","CONTACTABLE","INVITED","LANDED","REGISTERING",
  "OTP_VERIFIED","PAYMENT_COMPLETE","ACTIVATED","PROFILE_ENRICHMENT",
  "VERIFIED","RECOMMENDATION_ELIGIBLE","LIVE",
];

export function OnboardingTimeline({ contractorId }: { contractorId: string }) {
  const { state, events, loading } = useContractorTimeline(contractorId);

  if (loading) return <div className="text-readable-muted text-sm">Chargement…</div>;
  if (!state) return <div className="text-readable-muted text-sm">Aucun état d'onboarding.</div>;

  const reached = new Set(events.map(e => e.to_state));

  return (
    <div className="alex-immersive space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <div className={`text-sm ${STATE_COLOR[state.state]}`}>{STATE_LABELS[state.state]}</div>
          <div className="text-readable-muted text-xs">
            Confiance {state.confidence_score ?? "—"} · Prêt {state.readiness_score ?? "—"}
          </div>
        </div>
        {state.blocked_reason && (
          <span className="text-rose-400 text-xs">Bloqué: {state.blocked_reason}</span>
        )}
      </header>

      <ol className="space-y-2">
        {STEP_ORDER.map(step => {
          const done = reached.has(step);
          const current = state.state === step;
          const event = events.find(e => e.to_state === step);
          return (
            <li key={step} className="flex items-start gap-3 rounded-xl glass-strong px-3 py-2">
              <span className={done ? "text-emerald-400" : "text-white/20"}>{done ? "✓" : "○"}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${current ? "text-white font-semibold" : "text-readable-body"}`}>
                  {STATE_LABELS[step]}
                </div>
                {event && (
                  <div className="text-readable-muted text-[11px] flex flex-wrap gap-2">
                    <span>{formatQcDateTime(event.created_at)}</span>
                    <span>·</span>
                    <span>{event.actor}</span>
                    {event.retry_count > 0 && <><span>·</span><span>retry {event.retry_count}</span></>}
                    {event.error && <span className="text-rose-400">· {event.error}</span>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
