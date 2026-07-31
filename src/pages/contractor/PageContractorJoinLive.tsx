/**
 * /contractor/join — single-input live activation entry.
 * Cinematic dark, mobile-first, no extra clicks.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { detectInputKind } from "@/config/contractorOnboarding";

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
      navigate(`/contractor/analysis?run=${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#060B14] text-foreground flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Activation Fondateur — 1 $ aujourd'hui</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Activez votre profil UNPRO en moins de 2 minutes.
          </h1>
          <p className="mt-3 text-white/75 text-[15px] leading-snug">
            Entrez votre site web, votre RBQ, votre NEQ ou votre numéro de
            téléphone. On extrait, on analyse et on bâtit votre profil
            intelligent.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="isroyal.ca"
                autoFocus
                inputMode="url"
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
                : <>Lancer l'analyse <ArrowRight className="w-4 h-4" /></>}
            </button>
            {error && (
              <p className="text-sm text-red-400 text-center pt-1">{error}</p>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-white/75">
            Aucune carte requise pour l'analyse. Profil activable au tarif
            Fondateur.
          </p>
        </div>
      </div>
    </main>
  );
}
