/**
 * PageOutreachActivationSuccess — /activation/success?session_id=…&token=…
 *
 * Backend is the source of truth. This page polls verify-contractor-activation
 * until the contractor + profile actually exist. States:
 *   VERIFYING  — Stripe redirect landed, backend hasn't caught up
 *   PROCESSING — Stripe confirmed paid, contractor/profile still being created
 *   ACTIVATED  — contractor + contractor_profile exist, prospect linked
 *   FAILED     — after 30s + repair attempt, still no profile
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type State = "VERIFYING" | "PROCESSING" | "ACTIVATED" | "FAILED";

interface VerifyResponse {
  state: State;
  recommendable?: boolean;
  contractor_id?: string;
  prospect_id?: string;
  business_name?: string;
  has_contractor?: boolean;
  has_profile?: boolean;
  reason?: string;
}

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 30_000;

export default function PageOutreachActivationSuccess() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const sessionId = params.get("session_id");
  const [state, setState] = useState<State>("VERIFYING");
  const [info, setInfo] = useState<VerifyResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [repairTried, setRepairTried] = useState(false);

  useEffect(() => {
    if (!token && !sessionId) { setState("FAILED"); return; }
    let cancelled = false;
    const start = Date.now();

    async function verifyOnce(): Promise<VerifyResponse | null> {
      try {
        const { data } = await supabase.functions.invoke("verify-contractor-activation", {
          body: { session_id: sessionId, token },
        });
        return (data as VerifyResponse) ?? null;
      } catch { return null; }
    }

    async function tryRepair() {
      if (!sessionId) return;
      try {
        await supabase.functions.invoke("repair-paid-contractor-activation", {
          body: { session_id: sessionId },
        });
      } catch { /* ignore */ }
    }

    (async function loop() {
      while (!cancelled) {
        const now = Date.now();
        const e = now - start;
        setElapsed(e);
        const res = await verifyOnce();
        if (cancelled) return;
        if (res) {
          setInfo(res);
          setState(res.state);
          if (res.state === "ACTIVATED") return;
        }
        if (e > POLL_MAX_MS) {
          if (!repairTried) {
            setRepairTried(true);
            await tryRepair();
            // one more verification pass after repair
            const after = await verifyOnce();
            if (!cancelled && after) { setInfo(after); setState(after.state); if (after.state === "ACTIVATED") return; }
          }
          if (!cancelled) setState((s) => s === "ACTIVATED" ? s : "FAILED");
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    })();

    return () => { cancelled = true; };
  }, [token, sessionId, repairTried]);

  const activated = state === "ACTIVATED";
  const busy = state === "VERIFYING" || state === "PROCESSING";
  const failed = state === "FAILED";

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="max-w-xl mx-auto px-6 py-16">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs backdrop-blur mb-6 ${
          activated ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" :
          failed ? "border-amber-400/30 bg-amber-500/10 text-amber-200" :
          "border-white/20 bg-white/5 text-white/70"
        }`}>
          {activated && <CheckCircle2 className="h-3 w-3" />}
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          {failed && <AlertTriangle className="h-3 w-3" />}
          <span>
            {activated ? "Profil activé" :
             state === "VERIFYING" ? "Vérification du paiement…" :
             state === "PROCESSING" ? "Paiement reçu — activation en cours…" :
             "Activation à finaliser"}
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.03em]">
          {activated ? <>Votre profil UNPRO est activé. ✅</> :
           failed ? <>Paiement reçu. Votre profil est presque prêt.</> :
           <>Paiement reçu. Activation en cours…</>}
        </h1>
        <p className="mt-4 text-lg text-white/75">
          {activated
            ? <>Votre paiement de 1 $ a été confirmé{info?.business_name ? <> pour <span className="font-medium text-white">{info.business_name}</span></> : null}.</>
            : failed
            ? <>Nous finalisons la création de votre profil en arrière-plan. Notre équipe est notifiée automatiquement — vous n'avez rien à faire.</>
            : <>Nous confirmons la création de votre profil auprès de notre système. Ça prend habituellement quelques secondes.</>
          }
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <h2 className="text-sm uppercase tracking-widest text-white/50 mb-4">Prochaines étapes</h2>
          <ul className="space-y-3 text-sm">
            <Step done>Paiement confirmé</Step>
            <Step done={activated || (info?.has_contractor ?? false)}>Compte entrepreneur créé</Step>
            <Step done={activated || (info?.has_profile ?? false)}>Profil public initialisé</Step>
            <Step done={!!info?.recommendable}>Éligibilité aux recommandations Alex</Step>
            <Step>Compléter mon profil</Step>
            <Step>Ajouter mes disponibilités</Step>
          </ul>
          {busy && (
            <p className="mt-4 text-xs text-white/40">
              Synchronisation en cours… ({Math.floor(elapsed / 1000)}s / 30s)
            </p>
          )}
          {failed && (
            <p className="mt-4 text-xs text-amber-300/80">
              Une réparation automatique a été déclenchée. Si votre profil n'apparaît pas dans quelques minutes, contactez support@unpro.ca avec la référence : <span className="font-mono">{sessionId?.slice(0, 20)}…</span>
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            size="lg"
            disabled={busy}
            className="h-14 flex-1 text-base bg-white text-black hover:bg-white/90 rounded-2xl font-medium disabled:opacity-60"
          >
            <Link to={token ? `/invitation/${token}/edit` : "/entrepreneur/onboarding"}>
              Compléter mon profil <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 flex-1 text-base rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10">
            <Link to="/dashboard/availability">Ajouter mes disponibilités</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function Step({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 h-4 w-4 rounded-full border ${done ? "bg-emerald-400 border-emerald-400" : "border-white/30 bg-transparent"}`} />
      <span className={done ? "text-white" : "text-white/60"}>{children}</span>
    </li>
  );
}
