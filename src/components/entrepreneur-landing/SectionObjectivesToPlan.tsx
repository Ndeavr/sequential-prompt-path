import { motion } from "framer-motion";
import { ArrowRight, X, Check, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const calcPoints = [
  "Soumissions actuelles",
  "% de gain",
  "Montant moyen des contrats",
  "% profit",
  "Objectif mensuel",
  "Capacité de rendez-vous",
  "Type de projets",
];

const outputs = [
  "Nombre de rendez-vous requis",
  "Mix S / M / L / XL / XXL",
  "Plan recommandé",
  "Projection revenus",
  "Projection profit",
];

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionObjectivesToPlan({ onTrackCta }: Props) {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4 bg-card/40">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-3">
            <Calculator className="w-3.5 h-3.5" />
            Calculateur intelligent
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display mb-2">
            Vos objectifs → Votre plan
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Le système calcule le plan optimal selon vos données réelles.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Inputs */}
          <div className="rounded-2xl border border-border/40 bg-card/80 p-5 space-y-2.5">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Vos données</p>
            {calcPoints.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {p}
              </div>
            ))}
          </div>

          {/* Outputs */}
          <div className="rounded-2xl border border-success/20 bg-success/5 p-5 space-y-2.5">
            <p className="text-xs font-bold text-success uppercase tracking-wider mb-3">Résultats UNPRO</p>
            {outputs.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground/90">
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
            <p className="text-xs font-bold text-destructive">Actuel</p>
            {["Trop de soumissions", "Trop de friction", "Conversion variable"].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground/70">
                <X className="w-3 h-3 text-destructive" />{t}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-2">
            <p className="text-xs font-bold text-success">Avec UNPRO</p>
            {["Moins de soumissions", "Plus de rendez-vous sérieux", "Meilleur potentiel de fermeture"].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground/90">
                <Check className="w-3 h-3 text-success" />{t}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="gap-2 font-bold"
            onClick={() => { onTrackCta("plan_preview", "objectives"); navigate("/entrepreneur/pricing"); }}
          >
            Voir mon plan recommandé
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
