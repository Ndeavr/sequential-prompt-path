/**
 * UNPRO — PanelAIExplainedSimple
 * 3-step visual explanation of how UNPRO's AI works.
 */
import { motion } from "framer-motion";
import { ScanSearch, GitCompareArrows, CalendarCheck } from "lucide-react";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";
import BadgeAEOAuthority from "./BadgeAEOAuthority";

const STEPS = [
  {
    icon: ScanSearch,
    title: "Détection",
    description: "UNPRO analyse votre problème — photo, texte ou voix — et identifie la cause probable instantanément.",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    icon: GitCompareArrows,
    title: "Recommandation",
    description: "UNPRO compare les entrepreneurs selon score, disponibilité et compatibilité avec votre projet.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: CalendarCheck,
    title: "Décision",
    description: "UNPRO recommande le meilleur professionnel et vous permet de réserver immédiatement.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

interface Props {
  variant?: "full" | "compact";
}

export default function PanelAIExplainedSimple({ variant = "full" }: Props) {
  const isCompact = variant === "compact";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className="space-y-6"
    >
      {!isCompact && (
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <h2 className="font-display text-xl font-bold text-foreground">
            Comment fonctionne l'IA UNPRO?
          </h2>
          <BadgeAEOAuthority />
        </motion.div>
      )}

      <div className={isCompact ? "space-y-3" : "grid gap-4 md:grid-cols-3"}>
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            variants={fadeUp}
            className="glass-card rounded-2xl p-5 flex items-start gap-4"
          >
            <div className={`rounded-xl p-2.5 ${step.bg} shrink-0`}>
              <step.icon className={`h-5 w-5 ${step.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
