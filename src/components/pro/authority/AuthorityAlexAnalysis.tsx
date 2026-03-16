/**
 * Alex AI Analysis section
 */
import { motion } from "framer-motion";
import { Brain, Zap, MessageSquare, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const insights = [
  { label: "Priorité immédiate", value: "Photos de projets", icon: Zap, color: "text-warning" },
  { label: "Action rapide", value: "Répondre aux avis", icon: MessageSquare, color: "text-accent" },
  { label: "Plus grand levier", value: "Crédibilité et preuves", icon: ShieldCheck, color: "text-success" },
];

export default function AuthorityAlexAnalysis() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      {/* Top gradient line */}
      <div className="h-px bg-gradient-to-r from-primary via-secondary to-accent" />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display text-sm font-semibold text-foreground">Analyse Alex</h3>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">IA</span>
        </div>

        {/* Analysis text */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Votre profil montre une bonne base d'expertise, mais votre <span className="text-foreground font-medium">Priorité IA</span> et votre <span className="text-foreground font-medium">crédibilité</span> limitent encore votre visibilité. Ajoutez des photos réelles, complétez vos villes desservies et renforcez vos preuves de confiance pour augmenter rapidement votre score.
        </p>

        {/* Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {insights.map((ins, i) => (
            <motion.div
              key={ins.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
              className="rounded-xl border border-border/40 bg-muted/20 p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <ins.icon className={`w-3.5 h-3.5 ${ins.color}`} />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{ins.label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{ins.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button className="flex-1 gap-2 h-10 text-sm bg-primary hover:bg-primary/90">
            <Brain className="w-4 h-4" />
            Voir mon plan d'amélioration
          </Button>
          <Button variant="outline" className="flex-1 gap-2 h-10 text-sm border-border/50 hover:border-primary/40">
            Comparer avec le top local
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
