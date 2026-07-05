import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function PageScanIARun() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("");

  const runScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);

    const stages = [
      "Analyse du site…",
      "Vérification de la présence IA…",
      "Détection des concurrents…",
      "Calcul du score UNPRO…",
    ];
    let i = 0;
    setStage(stages[0]);
    const iv = setInterval(() => {
      i = (i + 1) % stages.length;
      setStage(stages[i]);
    }, 1100);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("scan-ia-run", {
        body: { input: input.trim() },
      });
      clearInterval(iv);

      if (fnError || !data?.success) {
        setError(data?.error || fnError?.message || "Analyse impossible pour le moment.");
        setLoading(false);
        return;
      }

      navigate(`/scan-ia/rapport?st=${encodeURIComponent(data.session_token)}`);
    } catch (err) {
      clearInterval(iv);
      setError(String(err));
      setLoading(false);
    }
  };

  return (
    <div className="alex-immersive min-h-screen bg-[#050816] text-readable">
      <Helmet>
        <title>Vérifiez votre visibilité IA — Scan IA UNPRO</title>
      </Helmet>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-12">
        <div className="mb-2 text-xs uppercase tracking-widest text-white/50">Étape 1 sur 3</div>
        <h1 className="mb-3 text-center text-3xl font-semibold text-white md:text-4xl">
          Vérifiez votre visibilité IA
        </h1>
        <p className="mb-10 text-center text-white/60">
          Entrez le nom de votre entreprise, votre site web ou votre profil Google.
        </p>

        <form onSubmit={runScan} className="w-full">
          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur md:flex-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ex. isroyal.ca ou Isolation Solution Royal"
              disabled={loading}
              className="flex-1 rounded-2xl bg-transparent px-4 py-4 text-white placeholder:text-white/40 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-[#050816] transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse…
                </>
              ) : (
                <>
                  Scanner
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {loading && (
            <div className="mt-6 text-center text-sm text-white/60">{stage}</div>
          )}
          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
