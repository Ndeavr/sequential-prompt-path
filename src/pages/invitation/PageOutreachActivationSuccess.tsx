/**
 * PageOutreachActivationSuccess — /activation/success?session_id=…&token=…
 * Confirms payment for the SMS-outreach 1$ activation flow.
 * The Stripe webhook is the source of truth — this page only reads state and displays the checklist.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function PageOutreachActivationSuccess() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [prospect, setProspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    (async function poll() {
      for (let i = 0; i < 8 && !cancelled; i++) {
        try {
          const { data } = await supabase.functions.invoke("invitation-resolve", { body: { token } });
          if (data?.prospect?.already_paid || data?.prospect?.recommendable) {
            if (!cancelled) { setProspect(data.prospect); setLoading(false); return; }
          }
          if (!cancelled) { setProspect(data?.prospect ?? null); setAttempts(i + 1); }
        } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, 1500));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="max-w-xl mx-auto px-6 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200 backdrop-blur mb-6">
          <CheckCircle2 className="h-3 w-3" />
          <span>Paiement confirmé</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.03em]">
          Votre profil UNPRO est activé. ✅
        </h1>
        <p className="mt-4 text-lg text-white/75">
          Votre paiement de 1 $ a été confirmé{prospect?.business_name ? <> pour <span className="font-medium text-white">{prospect.business_name}</span></> : null}.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <h2 className="text-sm uppercase tracking-widest text-white/50 mb-4">Prochaines étapes</h2>
          <ul className="space-y-3 text-sm">
            <Step done>Paiement confirmé</Step>
            <Step done={!loading && !!prospect?.already_paid}>Profil activé</Step>
            <Step done={!!prospect?.recommendable}>Éligibilité aux recommandations Alex</Step>
            <Step>Compléter mon profil</Step>
            <Step>Ajouter mes disponibilités</Step>
          </ul>
          {loading && <p className="mt-4 text-xs text-white/40">Synchronisation en cours (tentative {attempts}/8)…</p>}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg" className="h-14 flex-1 text-base bg-white text-black hover:bg-white/90 rounded-2xl font-medium">
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
