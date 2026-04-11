import { useState } from "react";
import SeoHead from "@/seo/components/SeoHead";
import FormDiagnosticCondoQuick from "@/components/condo-diagnostic/FormDiagnosticCondoQuick";
import CardDiagnosticScoreResult from "@/components/condo-diagnostic/CardDiagnosticScoreResult";
import SectionDiagnosticResultActions from "@/components/condo-diagnostic/SectionDiagnosticResultActions";
import { computeDiagnostic, type DiagnosticInput, type DiagnosticResult } from "@/lib/condoDiagnosticScoring";
import { Button } from "@/components/ui/button";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PageDiagnosticCondoIA() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const navigate = useNavigate();

  const handleComplete = (input: DiagnosticInput) => {
    setResult(computeDiagnostic(input));
  };

  return (
    <>
      <SeoHead
        title="Diagnostic Condo IA Gratuit — UNPRO"
        description="Obtenez votre score de conformité condo en 60 secondes. Détection des risques, actions prioritaires et conformité Loi 16."
        canonical="https://unpro.ca/condos/diagnostic"
      />
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8 md:py-12 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Diagnostic Condo IA
            </h1>
            <p className="text-sm text-muted-foreground">
              {result
                ? "Voici votre score de conformité et vos actions prioritaires."
                : "Répondez à 3 questions pour obtenir votre score de conformité gratuit."}
            </p>
          </div>

          {!result ? (
            <FormDiagnosticCondoQuick onComplete={handleComplete} />
          ) : (
            <div className="space-y-6">
              <CardDiagnosticScoreResult result={result} />
              <SectionDiagnosticResultActions result={result} />

              <div className="space-y-3 pt-2">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => navigate("/condos/dashboard")}
                >
                  Commencer maintenant <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={() => setResult(null)}
                >
                  <RotateCcw className="h-4 w-4" /> Refaire le diagnostic
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
