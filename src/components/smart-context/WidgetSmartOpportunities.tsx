/**
 * <WidgetSmartOpportunities> — drop-in widget that lists top recommendations
 * for a given surface (plans / dashboard / profile / automation / territory).
 *
 * Premium glass card, fr-CA, Concierge Décisif tone.
 */
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import {
  getRecommendationsForSurface,
  type SmartSurface,
} from "@/features/smartContext/recommendationsBySurface";
import { useGoalProfile } from "@/features/smartContext/useGoalProfile";
import type { SmartContextRuntime } from "@/features/smartContext/types";

interface Props {
  surface: SmartSurface;
  runtime?: SmartContextRuntime;
  limit?: number;
  title?: string;
  onAction?: (entryId: string) => void;
  compact?: boolean;
}

const KIND_ICON: Record<string, React.ElementType> = {
  capacity_warning: AlertTriangle,
  upgrade: TrendingUp,
  opportunity: Sparkles,
  recommended: Zap,
  visibility: Sparkles,
};

const KIND_COLOR: Record<string, string> = {
  capacity_warning: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  upgrade: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  opportunity: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  recommended: "text-primary bg-primary/10 border-primary/30",
  visibility: "text-violet-500 bg-violet-500/10 border-violet-500/30",
};

export function WidgetSmartOpportunities({
  surface,
  runtime,
  limit = 3,
  title,
  onAction,
  compact,
}: Props) {
  const { data: goalProfile } = useGoalProfile();
  const mergedRuntime: SmartContextRuntime = {
    goal: goalProfile?.primary_goal,
    capacity: goalProfile?.capacity_per_month ?? undefined,
    ...runtime,
  };

  const recos = getRecommendationsForSurface(surface, mergedRuntime, limit);
  if (recos.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[28px] border border-border/40 bg-card/70 backdrop-blur-xl p-5 space-y-4"
    >
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-foreground text-background p-2">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            UNPRO Intelligence
          </p>
          <h3 className="text-base font-semibold text-foreground leading-tight">
            {title ?? "Vos opportunités prioritaires"}
          </h3>
        </div>
      </header>

      <ul className={compact ? "space-y-2" : "space-y-3"}>
        {recos.map(({ entry, recommendation }) => {
          if (!recommendation) return null;
          const Icon = KIND_ICON[recommendation.kind] ?? Sparkles;
          const color = KIND_COLOR[recommendation.kind] ?? KIND_COLOR.recommended;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onAction?.(entry.id)}
                className="group w-full text-left rounded-2xl border border-border/40 bg-background/40 p-3 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                style={{ transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 rounded-xl border p-2 ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {entry.label}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recommendation.reasonFr}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

export default WidgetSmartOpportunities;
