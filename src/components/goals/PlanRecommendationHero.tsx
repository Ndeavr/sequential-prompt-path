import { motion } from "framer-motion";
import { Sparkles, Check, ArrowUp, ArrowDown, Crown, Shield, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPlanById, formatPlanPrice } from "@/config/contractorPlans";

const PLAN_META: Record<string, { icon: typeof Shield; projects: string; color: string }> = {
  recrue: { icon: Shield, projects: "S/M", color: "text-muted-foreground" },
  pro: { icon: Zap, projects: "S/M/L", color: "text-primary" },
  premium: { icon: Star, projects: "S → XL", color: "text-secondary" },
  elite: { icon: Crown, projects: "Toutes classes", color: "text-yellow-500" },
  signature: { icon: Crown, projects: "Exclusivité", color: "text-rose-500" },
};

interface Props {
  recommendedPlan: string;
  primaryObjective: string;
  monthlyAppointments: number;
  onSelectPlan: (plan: string) => void;
  onTalkToAlex: () => void;
}

function getWhyRecommended(plan: string, objective: string): string {
  const reasons: Record<string, Record<string, string>> = {
    pro: {
      default: "Le plan Pro vous donne accès aux projets jusqu'à L et vous rend visible dans votre zone.",
      maintain: "Le Pro suffit pour maintenir un flux régulier de rendez-vous ciblés.",
    },
    premium: {
      default: "Le Premium débloque les projets XL et l'auto-acceptation pour ne rien manquer.",
      profit: "Les projets XL ont une valeur 3× plus élevée — idéal pour la croissance de profits.",
      appointments: "L'auto-acceptation Premium vous fait gagner chaque opportunité en priorité.",
    },
    elite: {
      default: "L'Élite vous donne l'accès à toutes les classes de projets et des analytics avancés.",
      compete: "Les analytics prioritaires vous permettent de voir et battre vos compétiteurs.",
      dominate: "L'Élite est le minimum pour dominer — visibilité maximale dans votre ville.",
    },
    signature: {
      default: "Le Signature vous donne l'exclusivité territoriale — personne d'autre ne peut vous concurrencer.",
      dominate: "L'exclusivité territoriale Signature signifie que TOUS les rendez-vous sont à vous.",
    },
  };
  return reasons[plan]?.[objective] || reasons[plan]?.default || "Ce plan correspond le mieux à votre profil et vos objectifs.";
}

function getWhyNotLower(plan: string): string {
  const msgs: Record<string, string> = {
    pro: "Le plan Recrue limite votre visibilité et ne donne accès qu'aux petits projets.",
    premium: "Le plan Pro n'inclut pas les projets XL ni l'auto-acceptation — vous risquez de manquer des opportunités.",
    elite: "Le Premium ne donne pas accès aux analytics avancés ni aux projets XXL.",
    signature: "L'Élite ne garantit pas l'exclusivité — des compétiteurs peuvent encore vous concurrencer.",
  };
  return msgs[plan] || "";
}

export default function PlanRecommendationHero({ recommendedPlan, primaryObjective, monthlyAppointments, onSelectPlan, onTalkToAlex }: Props) {
  const configPlan = getPlanById(recommendedPlan);
  const meta = PLAN_META[recommendedPlan] || PLAN_META.pro;
  const Icon = meta.icon;
  const displayPrice = configPlan ? configPlan.monthlyPrice / 100 : 0;
  const planName = configPlan?.name ?? "Pro";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden premium-border">
        <div className="bg-gradient-to-br from-background via-card to-background p-5 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan recommandé pour votre objectif</p>
            <div className="flex items-center justify-center gap-2">
              <Icon className={cn("w-6 h-6", meta.color)} />
              <h2 className="text-2xl font-black text-gradient">{planName}</h2>
            </div>
            <p className="text-3xl font-black text-foreground">
              {displayPrice > 0 ? `${displayPrice}$` : "Gratuit"}
              {displayPrice > 0 && <span className="text-sm font-normal text-muted-foreground">/mois</span>}
            </p>
          </div>

          {/* Why */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-1">
            <p className="text-xs font-bold text-primary flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Pourquoi ce plan
            </p>
            <p className="text-sm text-muted-foreground">
              {getWhyRecommended(recommendedPlan, primaryObjective)}
            </p>
          </div>

          {/* What it unlocks */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Ce qu'il débloque</p>
            <div className="space-y-1.5">
              {[
                `Projets ${plan.projects}`,
                monthlyAppointments > 0 ? `~${monthlyAppointments} RDV/mois requis pour votre objectif` : null,
                "Profil public vérifié",
                recommendedPlan !== "recrue" ? "Visibilité prioritaire" : null,
              ].filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Why not lower */}
          {getWhyNotLower(recommendedPlan) && (
            <div className="rounded-xl bg-orange-500/5 border border-orange-500/10 p-3 space-y-1">
              <p className="text-xs font-bold text-orange-500 flex items-center gap-1">
                <ArrowDown className="w-3.5 h-3.5" /> Le plan en dessous
              </p>
              <p className="text-sm text-muted-foreground">{getWhyNotLower(recommendedPlan)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Competitive shift */}
      <CompetitiveShiftPreview currentPosition="behind" projectedPosition={
        recommendedPlan === "signature" ? "dominant" :
        recommendedPlan === "elite" ? "ahead" :
        recommendedPlan === "premium" ? "equal" : "behind"
      } />

      {/* CTAs */}
      <div className="space-y-2">
        <Button
          size="lg"
          variant="premium"
          className="w-full h-12 rounded-xl text-base"
          onClick={() => onSelectPlan(recommendedPlan)}
        >
          <Sparkles className="w-4 h-4 mr-2" /> Continuer vers le paiement
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 rounded-xl"
          onClick={onTalkToAlex}
        >
          Parler à Alex
        </Button>
      </div>
    </motion.div>
  );
}

function CompetitiveShiftPreview({ currentPosition, projectedPosition }: { currentPosition: string; projectedPosition: string }) {
  const posLabels: Record<string, { label: string; color: string }> = {
    behind: { label: "En arrière", color: "text-orange-500" },
    equal: { label: "Ex aequo", color: "text-yellow-500" },
    ahead: { label: "Loin devant", color: "text-green-500" },
    dominant: { label: "Vous dominez", color: "text-primary" },
  };

  const current = posLabels[currentPosition] || posLabels.behind;
  const projected = posLabels[projectedPosition] || posLabels.equal;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-3">Position concurrentielle</p>
      <div className="flex items-center justify-between">
        <div className="text-center space-y-1">
          <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
          <p className={cn("text-sm font-bold", current.color)}>{current.label}</p>
        </div>
        <ArrowUp className="w-5 h-5 text-green-500 rotate-90" />
        <div className="text-center space-y-1">
          <p className="text-[10px] text-muted-foreground">Avec ce plan</p>
          <p className={cn("text-sm font-bold", projected.color)}>{projected.label}</p>
        </div>
      </div>
    </div>
  );
}
