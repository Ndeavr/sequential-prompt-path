/**
 * PageResultatAnalyseSoumissions — Display real analysis results behind an auth gate.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, MessageCircle, FolderOpen } from "lucide-react";
import {
  StepperAnalyseTroisSoumissions,
  SectionComparaisonIA,
  BadgeUsageSoumission,
  ModalAuthGateResultats,
  TeaserResultatsFloutes,
  claimAndLoadAnalysis,
  getStoredAnalysisId,
  type QuoteAnalysisPayload,
} from "@/features/quoteAnalyzer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PageResultatAnalyseSoumissions() {
  const [params] = useSearchParams();
  const analysisId = params.get("id") || getStoredAnalysisId();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [payload, setPayload] = useState<QuoteAnalysisPayload | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed || !analysisId || payload) return;
    setLoading(true);
    claimAndLoadAnalysis(analysisId)
      .then((row) => {
        setPayload(row.payload);
        setFileCount(row.file_count);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Impossible de charger votre analyse.");
      })
      .finally(() => setLoading(false));
  }, [authed, analysisId, payload]);

  const showGate = authed === false && !!analysisId;
  const teaserCount = fileCount || 3;

  return (
    <>
      <Helmet>
        <title>Résultat d'analyse | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/analyse-soumissions/importer"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Résultat de l'analyse</h1>
              <p className="text-xs text-muted-foreground">
                {payload ? `${payload.quotes.length} soumission${payload.quotes.length > 1 ? "s" : ""} comparée${payload.quotes.length > 1 ? "s" : ""}` : "Analyse prête"}
              </p>
            </div>
            <BadgeUsageSoumission type="comparison" />
          </div>

          <StepperAnalyseTroisSoumissions
            steps={[
              { label: "Importer", status: "completed" },
              { label: "Analyser", status: "completed" },
              { label: "Résultats", status: "active" },
            ]}
          />

          {!analysisId && (
            <div className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Aucune analyse trouvée.</p>
              <Button asChild className="rounded-xl">
                <Link to="/analyse-soumissions/importer">Importer des soumissions</Link>
              </Button>
            </div>
          )}

          {analysisId && payload && authed && (
            <SectionComparaisonIA result={payload} />
          )}

          {analysisId && !payload && (showGate || loading) && (
            <TeaserResultatsFloutes fileCount={teaserCount} />
          )}

          {payload && authed && (
            <div className="space-y-2 pt-4">
              <Button variant="outline" className="w-full gap-2 rounded-xl" size="lg" disabled>
                <Download className="h-4 w-4" /> Télécharger le rapport
              </Button>
              <Button asChild variant="outline" className="w-full gap-2 rounded-xl" size="lg">
                <Link to="/alex">
                  <MessageCircle className="h-4 w-4" /> Demander l'avis d'Alex
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full gap-2 rounded-xl text-muted-foreground" size="sm">
                <Link to="/dossier-soumissions/ajouter">
                  <FolderOpen className="h-3.5 w-3.5" /> Ajouter une soumission au dossier client
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <ModalAuthGateResultats
        open={showGate}
        fileCount={teaserCount}
        onAuthSuccess={() => setAuthed(true)}
      />
    </>
  );
}
