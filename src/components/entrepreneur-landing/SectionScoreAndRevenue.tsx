import { motion } from "framer-motion";
import { ArrowRight, TrendingDown, Eye, BarChart3, DollarSign, Zap, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const steps = [
  { icon: Zap, label: "Import rapide" },
  { icon: Eye, label: "Score actuel" },
  { icon: BarChart3, label: "Projection revenus" },
  { icon: FileCheck, label: "Objectifs" },
  { icon: DollarSign, label: "Plan recommandé" },
];

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionScoreAndRevenue({ onTrackCta }: Props) {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display mb-3">
            Votre score. Vos revenus perdus.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            En quelques minutes, UNPRO vous montre comment l'IA perçoit votre entreprise et ce que vous laissez sur la table.
          </p>
        </motion.div>

        {/* Mini items */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            "Comment l'IA perçoit votre entreprise",
            "Votre visibilité réelle",
            "Votre score pré-UNPRO",
            "Ce que vous laissez sur la table",
            "Comment récupérer ces revenus",
            "Moins de soumissions, plus de contrats",
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2 text-xs text-foreground/80 p-3 rounded-xl border border-border/40 bg-card/60"
            >
              <TrendingDown className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              {t}
            </motion.div>
          ))}
        </div>

        {/* Mini flow */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-xs font-medium text-foreground">
                <s.icon className="w-3.5 h-3.5 text-primary" />
                {s.label}
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="gap-2 font-bold"
            onClick={() => { onTrackCta("score_start", "score_revenue"); navigate("/entrepreneur/score"); }}
          >
            Commencer mon évaluation
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
