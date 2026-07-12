/**
 * FinalCTA — "Parler à Alex" + "Voir mon niveau de compatibilité".
 * "Comparer" est banni.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Gauge } from "lucide-react";

interface Props {
  contractorId: string;
  businessName: string;
}

export default function FinalCTA({ contractorId, businessName }: Props) {
  return (
    <section
      aria-labelledby="cta-heading"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6 space-y-4"
    >
      <div>
        <h2 id="cta-heading" className="text-lg font-semibold text-foreground">
          Obtenir une recommandation personnalisée
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Alex analyse votre projet et confirme si {businessName} est le meilleur choix pour vous.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild size="lg" className="w-full">
          <Link to={`/alex?contractor=${contractorId}`}>
            <Sparkles className="w-4 h-4" /> Parler à Alex
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link to={`/diagnostic?contractor=${contractorId}`}>
            <Gauge className="w-4 h-4" /> Voir mon niveau de compatibilité
          </Link>
        </Button>
      </div>
    </section>
  );
}
