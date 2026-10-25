/**
 * /contractor/join — single-input live activation entry.
 * Cinematic dark, mobile-first, no extra clicks.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { detectInputKind } from "@/config/contractorOnboarding";
import { CONTRACTOR_OFFER } from "@/lib/copy/contractorOffer";
import { buildContractorEntryUrl } from "@/config/contractorFunnel";

export default function PageContractorJoinLive() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    setError(null);
    try {
      const inputKind = detectInputKind(v);
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "activation-pipeline-start",
        { body: { input_value: v, input_kind: inputKind } },
      );
      if (invokeErr) throw invokeErr;
      const runId = (data as { run_id?: string })?.run_id;
      if (!runId) throw new Error("Réponse invalide du pipeline.");
      // Preserve invitation, affiliate and UTM context through the analysis step.
      navigate(buildContractorEntryUrl({ run: runId }, "/contractor/analysis"));
    } catch (err) {
      console.warn("[contractor/join] analysis start failed", err);
      setError("Nous n’avons pas pu démarrer l’analyse. Vérifiez l’information et réessayez.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#060B14] text-foreground flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{CONTRACTOR_OFFER.headline} {CONTRACTOR_OFFER.subheadline}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Découvrez le potentiel de votre entreprise sur UNPRO.
          </h1>
          <p className="mt-3 text-white/75 text-[15px] leading-snug">
            Indiquez votre site Web, votre RBQ, votre NEQ ou votre numéro de
            téléphone. Nous préparerons une première analyse à partir des
            informations disponibles. Vous pourrez confirmer les détails avant
            de vous inscrire.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={value}
                aria-label="Site Web, licence RBQ, NEQ ou téléphone de l’entreprise"
                onChange={(e) => setValue(e.target.value)}
                placeholder="isroyal.ca"
                autoFocus
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-base text-white placeholder:text-white/75 outline-none focus:border-amber-400/60 focus:bg-white/[0.06] transition"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !value.trim()}
              className="w-full rounded-2xl bg-amber-400 text-[#060B14] py-4 text-base font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-50"
            >
              {busy
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analyse en cours…</>
                : <>Voir mon analyse <ArrowRight className="w-4 h-4" /></>}
            </button>
            {error && (
              <p className="text-sm text-red-400 text-center pt-1">{error}</p>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-white/75">
            {CONTRACTOR_OFFER.noPaymentNote}. Le plan personnalisé vient après
            votre profil et vos objectifs.
          </p>
        </div>
      </div>
    </main>
  );
}
