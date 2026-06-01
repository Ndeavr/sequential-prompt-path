import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Snapshot {
  paid: boolean;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  contractor_name?: string;
  selected_plan?: string;
}

export default function PageIsrDemoSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.functions.invoke("confirm-isr-demo-checkout", {
        body: { session_id: sessionId },
      });
      setSnap((data ?? { paid: false }) as Snapshot);
      setLoading(false);
      if (data?.paid && typeof window !== "undefined") {
        localStorage.removeItem("unpro.isrDemoRunId");
      }
    })();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      <Helmet>
        <title>Signature activé — Démo ISR</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-20 h-[480px] w-[480px] rounded-full bg-emerald-400/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-cyan-400/15 blur-[140px]" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 sm:px-6 pt-16 pb-16">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8">
          <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">Démo ISR</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Signature activé — Démo ISR complétée
          </h1>

          <dl className="mt-6 grid grid-cols-1 gap-3 text-sm">
            <Row label="Entreprise" value={snap?.contractor_name ?? "Isolation Solution Royal"} />
            <Row label="Plan" value={snap?.selected_plan ?? "Signature"} />
            <Row
              label="Paiement démo"
              value={
                snap?.amount_total != null
                  ? `${(snap.amount_total / 100).toFixed(2)} ${String(snap.currency ?? "cad").toUpperCase()}`
                  : "1.00 CAD"
              }
            />
            <Row
              label="Statut"
              value={loading ? "Vérification…" : snap?.paid ? "Payment received" : (snap?.payment_status ?? "En attente")}
            />
            <Row label="Prochaine étape" value="Activation AIPP ISR" />
          </dl>

          <div className="mt-7 flex flex-col sm:flex-row gap-2">
            <Link
              to="/isolation-solution-royal"
              className="flex-1 rounded-[18px] bg-amber-300 px-5 py-3 text-center text-sm font-semibold text-[#050816] hover:-translate-y-0.5 transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
            >
              Voir le profil ISR
            </Link>
            <Link
              to="/demo/isroyal-alex-plan-test"
              className="flex-1 rounded-[18px] border border-white/15 bg-white/[0.04] px-5 py-3 text-center text-sm font-medium text-white/90 hover:bg-white/[0.08] transition-all"
            >
              Retour à la démo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <dt className="text-white/50">{label}</dt>
      <dd className="text-white font-medium">{value}</dd>
    </div>
  );
}
