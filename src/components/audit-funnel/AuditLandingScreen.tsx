import { Button } from "@/components/ui/button";
import { Shield, Sparkles, ArrowRight } from "lucide-react";

interface Props { onStart: () => void; }

export function AuditLandingScreen({ onStart }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary mb-6">
        <Sparkles className="w-3 h-3" /> Score réel · Données publiques vérifiées
      </div>
      <h1 className="font-display text-3xl md:text-5xl font-bold mb-6 leading-tight">
        Découvrez comment votre entreprise est perçue par Google, les IA et vos futurs clients.
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
        UNPRO analyse votre présence web, vos signaux de confiance et votre capacité à convertir. Aucun score inventé.
      </p>
      <Button size="lg" onClick={onStart} className="gap-2 text-base px-8 py-6">
        Lancer mon analyse gratuite <ArrowRight className="w-5 h-5" />
      </Button>
      <div className="flex flex-wrap justify-center gap-4 mt-10">
        {["Score réel", "Données publiques vérifiées", "Résultats clairs", "Recommandation immédiate"].map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3 h-3 text-primary" /> {t}
          </div>
        ))}
      </div>
    </div>
  );
}
