/**
 * StepPlanRecommendation — Shows the AI-matched plan recommendation.
 */
import { motion } from "framer-motion";
import { Crown, Star, Zap, CheckCircle2, ArrowRight, Shield, Calendar, MapPin } from "lucide-react";
import type { ObjectivesData } from "./StepObjectivesCapture";

interface PlanMatch {
  recommended_plan: string;
  monthly_rdv_needed: number;
  projected_monthly_revenue: number;
  projected_monthly_profit: number;
  exclusivity_possible: boolean;
  territory_status: string;
  reasoning: string;
}

interface Props {
  objectives: ObjectivesData | null;
  businessName: string;
  city: string;
  activity: string;
  onSelectPlan: (plan: string) => void;
  isProcessing: boolean;
}

const PLAN_DEFS: Record<string, { icon: any; color: string; price: string; features: string[] }> = {
  recrue: { icon: Zap, color: "text-muted-foreground", price: "0$", features: ["Profil de base", "1 territoire", "2 catégories"] },
  pro: { icon: Zap, color: "text-blue-400", price: "49$", features: ["Profil optimisé", "3 territoires", "Rendez-vous qualifiés"] },
  premium: { icon: Star, color: "text-secondary", price: "99$", features: ["Profil premium", "5 territoires", "Projets S→XL", "Matching prioritaire"] },
  elite: { icon: Crown, color: "text-yellow-400", price: "199$", features: ["Profil élite", "10 territoires", "Tous projets", "Analytics avancés"] },
  signature: { icon: Crown, color: "text-rose-400", price: "Sur mesure", features: ["Exclusivité territoriale", "Tous projets", "Alex dédié", "Booking premium"] },
};

function computePlanMatch(objectives: ObjectivesData | null, city: string): PlanMatch {
  if (!objectives) {
    return { recommended_plan: "pro", monthly_rdv_needed: 8, projected_monthly_revenue: 10000, projected_monthly_profit: 2000, exclusivity_possible: false, territory_status: "available", reasoning: "Plan de base recommandé." };
  }

  const monthlyRdv = objectives.appointments_capacity_weekly * 4;
  const target = objectives.revenue_target_monthly;

  let plan = "pro";
  if (target >= 50000 || objectives.preferred_project_size === "xlarge") plan = "signature";
  else if (target >= 30000 || objectives.preferred_project_size === "large") plan = "elite";
  else if (target >= 15000) plan = "premium";

  return {
    recommended_plan: plan,
    monthly_rdv_needed: Math.max(4, Math.round(monthlyRdv * 0.6)),
    projected_monthly_revenue: target,
    projected_monthly_profit: Math.round(target * 0.22),
    exclusivity_possible: plan === "signature" || plan === "elite",
    territory_status: "available",
    reasoning: `Basé sur votre objectif de ${target.toLocaleString("fr-CA")}$/mois et votre capacité de ${monthlyRdv} rendez-vous/mois.`,
  };
}

export default function StepPlanRecommendation({ objectives, businessName, city, activity, onSelectPlan, isProcessing }: Props) {
  const match = computePlanMatch(objectives, city);
  const planDef = PLAN_DEFS[match.recommended_plan] || PLAN_DEFS.pro;
  const PlanIcon = planDef.icon;

  const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Votre plan recommandé</h2>
        <p className="text-sm text-muted-foreground">{match.reasoning}</p>
      </div>

      {/* Recommended plan card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border-2 border-primary/30 p-6 relative overflow-hidden"
      >
        <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
          RECOMMANDÉ
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <PlanIcon className={`w-6 h-6 ${planDef.color}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground capitalize">{match.recommended_plan}</p>
            <p className="text-sm text-muted-foreground">{planDef.price}/mois</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {planDef.features.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">{f}</span>
            </div>
          ))}
        </div>

        {/* Projections */}
        <div className="grid grid-cols-3 gap-3 border-t border-border/30 pt-4">
          <div className="text-center">
            <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{match.monthly_rdv_needed}</p>
            <p className="text-[10px] text-muted-foreground">RDV/mois</p>
          </div>
          <div className="text-center">
            <Zap className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{fmt(match.projected_monthly_revenue)}</p>
            <p className="text-[10px] text-muted-foreground">Revenu projeté</p>
          </div>
          <div className="text-center">
            <MapPin className="w-4 h-4 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{match.territory_status === "available" ? "✓" : "⏳"}</p>
            <p className="text-[10px] text-muted-foreground">Territoire</p>
          </div>
        </div>
      </motion.div>

      {/* Trust message */}
      <div className="rounded-xl bg-card border border-border/40 p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Pas de leads partagés</p>
          <p className="text-xs text-muted-foreground mt-1">
            Rendez-vous avec clients sérieux et compatibles. Matching basé sur domaine, localisation, objectifs et capacité.
          </p>
        </div>
      </div>

      {/* Alex conclusion */}
      <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
        <p className="text-xs font-semibold text-primary mb-1">Alex</p>
        <p className="text-sm text-foreground">
          Voici le plan le plus logique pour {businessName}. Avec {match.monthly_rdv_needed} rendez-vous qualifiés par mois, 
          vous pouvez récupérer ce que vous laissez sur la table.
        </p>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelectPlan(match.recommended_plan)}
        disabled={isProcessing}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? "Préparation..." : `Activer ${match.recommended_plan}`}
        {!isProcessing && <ArrowRight className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}
