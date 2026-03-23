/**
 * UNPRO — Compatibility Breakdown Card
 * Shows CCAI category scores + DNA traits in a premium glass card.
 */

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, MessageCircle, Users, Shield, Briefcase, Home } from "lucide-react";
import type { CCAICategoryScore } from "@/services/ccaiEngine";

interface CompatibilityBreakdownCardProps {
  categoryScores: CCAICategoryScore[];
  strengthsFr: string[];
  watchoutsFr: string[];
  recommendationFr: string;
}

const CATEGORY_META: Record<string, { icon: typeof MessageCircle; labelFr: string }> = {
  language_communication: { icon: MessageCircle, labelFr: "Communication" },
  involvement_complexity: { icon: Users, labelFr: "Implication" },
  scale_environment: { icon: Home, labelFr: "Environnement" },
  trust_values: { icon: Shield, labelFr: "Confiance" },
  professional_boundaries: { icon: Briefcase, labelFr: "Limites professionnelles" },
};

function CategoryBar({ category, matched, total, percent }: CCAICategoryScore) {
  const meta = CATEGORY_META[category] || { icon: Users, labelFr: category };
  const Icon = meta.icon;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{meta.labelFr}</span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {matched}/{total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className={`h-full rounded-full ${
            percent >= 75
              ? "bg-success"
              : percent >= 50
              ? "bg-warning"
              : "bg-destructive"
          }`}
        />
      </div>
    </div>
  );
}

export default function CompatibilityBreakdownCard({
  categoryScores,
  strengthsFr,
  watchoutsFr,
  recommendationFr,
}: CompatibilityBreakdownCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-[var(--shadow-md)]"
    >
      <div>
        <h3 className="text-base font-semibold text-foreground">Analyse de compatibilité</h3>
        <p className="text-sm text-muted-foreground mt-1">{recommendationFr}</p>
      </div>

      <div className="space-y-3">
        {categoryScores.map((cs) => (
          <CategoryBar key={cs.category} {...cs} />
        ))}
      </div>

      {strengthsFr.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-success">Points forts</p>
          <div className="space-y-1.5">
            {strengthsFr.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {watchoutsFr.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-warning">Points d'attention</p>
          <div className="space-y-1.5">
            {watchoutsFr.slice(0, 3).map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
