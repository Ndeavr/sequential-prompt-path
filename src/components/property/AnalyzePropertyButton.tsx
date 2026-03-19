import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  propertyId: string;
  onDone?: () => void;
};

export default function AnalyzePropertyButton({ propertyId, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke(
      "analyze-property",
      { body: { propertyId } },
    );

    if (fnError) {
      setError(fnError.message);
      setLoading(false);
      return;
    }

    if (!data?.ok) {
      setError(data?.error || "Analyse impossible.");
      setLoading(false);
      return;
    }

    setMessage(
      `Analyse terminée • Score ${data.score?.overall_score ?? "—"}/100 • ${data.recommendationsCount ?? 0} recommandation(s).`,
    );
    onDone?.();
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Analyse IA
        </p>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        Recalculer le score
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Génère un nouveau Score Maison et met à jour les recommandations selon
        les données disponibles.
      </p>

      <Button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {loading ? "Analyse en cours…" : "Analyser cette propriété"}
      </Button>

      {message && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-300">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
