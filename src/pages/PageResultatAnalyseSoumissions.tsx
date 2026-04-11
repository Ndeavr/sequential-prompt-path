/**
 * PageResultatAnalyseSoumissions — Display analysis results
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, MessageCircle, FolderOpen } from "lucide-react";
import {
  StepperAnalyseTroisSoumissions,
  SectionComparaisonIA,
  BadgeUsageSoumission,
} from "@/features/quoteAnalyzer";

// Mock result for demo
const MOCK_RESULT = {
  quotes: [
    { slot: 1, vendor: "Toitures Laval Pro", amount: 12500, warranty: "25 ans", score: 88, isBestValue: true, risks: [], inclusions: ["Bardeaux GAF", "Protection glace", "Nettoyage"], exclusions: ["Soffites"] },
    { slot: 2, vendor: "Couvreur Express", amount: 9800, warranty: "10 ans", score: 65, risks: ["Protection glace manquante", "Garantie courte"], inclusions: ["Bardeaux BP", "Nettoyage"], exclusions: ["Protection glace", "Ventilation"] },
    { slot: 3, vendor: "Pro-Toit Inc.", amount: 14200, warranty: "15 ans", score: 72, risks: ["Prix au-dessus du marché"], inclusions: ["Bardeaux BP", "Protection glace", "Ventilation"], exclusions: [] },
  ],
  recommendation: "Soumission de Toitures Laval Pro — meilleur rapport qualité-prix avec garantie de 25 ans et couverture complète.",
  confidenceScore: 87,
};

export default function PageResultatAnalyseSoumissions() {
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
              <p className="text-xs text-muted-foreground">3 soumissions comparées</p>
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

          <SectionComparaisonIA result={MOCK_RESULT} />

          {/* Actions */}
          <div className="space-y-2 pt-4">
            <Button variant="outline" className="w-full gap-2 rounded-xl" size="lg">
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
        </div>
      </div>
    </>
  );
}
