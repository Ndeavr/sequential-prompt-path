/**
 * <SmartGoalSelector> — Gate that asks the contractor's primary goal
 * before showing plans, territory, automation, etc.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTRACTOR_GOALS } from "@/features/smartContext/goals";
import { useGoalProfile } from "@/features/smartContext/useGoalProfile";
import type { GoalKey } from "@/features/smartContext/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onComplete?: (goal: GoalKey) => void;
  compact?: boolean;
}

export function SmartGoalSelector({ onComplete, compact }: Props) {
  const { data: existing, upsert } = useGoalProfile();
  const [selected, setSelected] = useState<GoalKey | null>(existing?.primary_goal ?? null);

  const handleSubmit = async () => {
    if (!selected) return;
    try {
      await upsert.mutateAsync({ primary_goal: selected });
      void (supabase as any).from("conversion_events").insert({
        event_type: "goal_set",
        value: JSON.stringify({ goal: selected }),
      });
      toast.success("Objectif enregistré. UNPRO ajuste vos recommandations.");
      onComplete?.(selected);
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'enregistrer l'objectif.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[28px] border border-border/40 bg-card/80 backdrop-blur-xl p-6 space-y-5 max-w-2xl mx-auto"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-foreground text-background p-2">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">UNPRO Intelligence</p>
          <h2 className="text-lg font-semibold text-foreground leading-tight">
            Quel est votre objectif principal ?
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            UNPRO adapte vos plans, votre territoire et vos recommandations en fonction de votre objectif.
          </p>
        </div>
      </div>

      <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
        {CONTRACTOR_GOALS.map((goal) => {
          const isSelected = selected === goal.key;
          return (
            <button
              key={goal.key}
              type="button"
              onClick={() => setSelected(goal.key)}
              className={`relative text-left rounded-2xl border p-3 transition-all duration-300 ${
                isSelected
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]"
                  : "border-border/40 bg-background/40 hover:border-border/80"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl shrink-0">{goal.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{goal.labelFr}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{goal.subFr}</p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!selected || upsert.isPending}
        className="w-full rounded-xl h-11"
      >
        {upsert.isPending ? "Enregistrement…" : "Continuer"}
      </Button>
    </motion.div>
  );
}

export default SmartGoalSelector;
