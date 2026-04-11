/**
 * PageImporterSoumissionComparative — Upload 1-3 quotes for comparison
 */
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  PanelDropzoneSoumissionComparative,
  StepperAnalyseTroisSoumissions,
  BadgeUsageSoumission,
} from "@/features/quoteAnalyzer";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function PageImporterSoumissionComparative() {
  const navigate = useNavigate();

  const handleStartAnalysis = (files: (File | null)[]) => {
    const filled = files.filter(Boolean);
    if (filled.length === 0) {
      toast.error("Ajoutez au moins une soumission.");
      return;
    }
    // TODO: create comparison session, upload files, run analysis
    toast.success(`Analyse de ${filled.length} soumission(s) lancée`);
    navigate("/analyse-soumissions/resultats");
  };

  return (
    <>
      <Helmet>
        <title>Importer des soumissions à comparer | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/analyse-soumissions"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Importer vos soumissions</h1>
              <p className="text-xs text-muted-foreground">Jusqu'à 3 fichiers PDF ou image</p>
            </div>
            <BadgeUsageSoumission type="comparison" />
          </div>

          <StepperAnalyseTroisSoumissions
            steps={[
              { label: "Importer", status: "active" },
              { label: "Analyser", status: "pending" },
              { label: "Résultats", status: "pending" },
            ]}
          />

          <PanelDropzoneSoumissionComparative onStartAnalysis={handleStartAnalysis} />
        </div>
      </div>
    </>
  );
}
