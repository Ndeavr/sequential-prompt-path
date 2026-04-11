/**
 * PageAnalyseTroisSoumissions — Landing page for the comparison flow
 */
import { Helmet } from "react-helmet-async";
import {
  HeroSectionAnalyseTroisSoumissions,
  PanelDifferenceSoumissionTypes,
} from "@/features/quoteAnalyzer";
import { BarChart3, Shield, AlertTriangle, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function PageAnalyseTroisSoumissions() {
  return (
    <>
      <Helmet>
        <title>Analyser jusqu'à 3 soumissions | UNPRO</title>
        <meta name="description" content="Comparez jusqu'à 3 soumissions d'entrepreneurs avec l'IA. Prix, garanties, risques analysés en 30 secondes." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <HeroSectionAnalyseTroisSoumissions />

        {/* What IA analyzes */}
        <section className="px-5 py-10">
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-xl border-2 border-dashed border-border/40 bg-muted/20 p-4 flex flex-col items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10" />
                    <p className="text-xs font-medium text-muted-foreground">Soumission {n}</p>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border/30" />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">L'IA analyse pour vous :</p>
                {[
                  { icon: BarChart3, text: "Comparaison des prix ligne par ligne" },
                  { icon: Shield, text: "Couverture d'assurance et garanties" },
                  { icon: AlertTriangle, text: "Éléments manquants et risques" },
                  { icon: Star, text: "Score de confiance par soumission" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/6 flex items-center justify-center shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Difference panel */}
        <section className="px-5 pb-10">
          <div className="max-w-lg mx-auto">
            <PanelDifferenceSoumissionTypes />
          </div>
        </section>
      </div>
    </>
  );
}
