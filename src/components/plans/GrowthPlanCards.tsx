/**
 * GrowthPlanCards — "Quel rythme de croissance voulez-vous ?"
 *
 * 4 plans en logique "opportunités/mois" (jamais "prix par lead").
 * Map vers les plans contractor existants (pro / premium / elite / signature).
 * Le badge RECOMMANDÉ POUR VOUS est dynamique (par défaut: premium).
 */
import { motion } from "framer-motion";
import { Check, Sparkles, TrendingUp, Crown, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTRACTOR_PLANS, type ContractorPlanSlug } from "@/config/contractorPlans";

export interface GrowthPlan {
  slug: ContractorPlanSlug;
  label: string;
  opportunities: string;
  description: string;
  icon: typeof Sparkles;
  accent: string;
}

const GROWTH_PLANS: GrowthPlan[] = [
  {
    slug: "pro",
    label: "Activation locale",
    opportunities: "≈ 5 opportunités qualifiées / mois",
    description: "Pour tester UNPRO et commencer à recevoir des projets qualifiés.",
    icon: Sparkles,
    accent: "from-sky-400 to-blue-500",
  },
  {
    slug: "premium",
    label: "Croissance stable",
    opportunities: "≈ 10 opportunités / mois",
    description: "Le meilleur équilibre entre visibilité, capacité et croissance.",
    icon: TrendingUp,
    accent: "from-blue-500 to-indigo-600",
  },
  {
    slug: "elite",
    label: "Domination régionale",
    opportunities: "≈ 25 opportunités / mois",
    description: "Priorité IA et visibilité renforcée dans votre territoire.",
    icon: Crown,
    accent: "from-indigo-500 to-purple-600",
  },
  {
    slug: "signature",
    label: "Expansion maximale",
    opportunities: "≈ 50 opportunités / mois",
    description: "Pour entreprises structurées voulant maximiser leur croissance.",
    icon: Rocket,
    accent: "from-purple-600 to-fuchsia-600",
  },
];

interface Props {
  selected: ContractorPlanSlug | null;
  onSelect: (slug: ContractorPlanSlug) => void;
  recommendedSlug?: ContractorPlanSlug;
  title?: string;
}

export default function GrowthPlanCards({
  selected,
  onSelect,
  recommendedSlug = "premium",
  title = "Quel rythme de croissance voulez-vous ?",
}: Props) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Choisissez le volume que votre équipe peut absorber confortablement.
        </p>
      </div>

      <div className="space-y-3">
        {GROWTH_PLANS.map((plan, i) => {
          const cfg = CONTRACTOR_PLANS.find((p) => p.slug === plan.slug);
          const isSelected = selected === plan.slug;
          const isRecommended = plan.slug === recommendedSlug;
          const Icon = plan.icon;

          return (
            <motion.button
              key={plan.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                onSelect(plan.slug);
                if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                  try { navigator.vibrate?.(10); } catch {}
                }
              }}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 transition-all relative overflow-hidden",
                "bg-card/80 backdrop-blur-sm",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 shadow-lg"
                  : "border-border/50 hover:border-primary/40"
              )}
            >
              {isRecommended && (
                <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">
                  Recommandé pour vous
                </span>
              )}

              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                    plan.accent
                  )}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bold text-foreground text-base">{plan.label}</h3>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-foreground">{cfg?.monthlyPrice ?? "—"}$</span>
                      <span className="text-[11px] text-muted-foreground">/mois</span>
                    </div>
                  </div>
                  <p className="text-[12px] font-medium text-primary mt-0.5">
                    {plan.opportunities}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground leading-snug mt-1.5">
                    {plan.description}
                  </p>
                </div>
              </div>

              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-border/40 flex items-center gap-1.5 text-[11px] text-primary font-medium"
                >
                  <Check className="h-3.5 w-3.5" /> Sélectionné
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
