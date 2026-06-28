import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "./ScoreRing";
import { ArrowRight, Sparkles, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Recommendation {
  id: string;
  recommended_plan_slug: string;
  recommended_price_cents: number;
  base_plan_price_cents: number;
  price_modifier_pct: number;
  estimated_monthly_appointments_min: number;
  estimated_monthly_appointments_max: number;
  estimated_revenue_min_cents: number;
  estimated_revenue_max_cents: number;
  exclusivity_level: string;
  territory_priority: string;
  market_score: number;
  opportunity_score: number;
  competition_score: number;
  recommendation_reason: { bullets: string[] };
}

const PLAN_LABELS: Record<string, string> = {
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium IA",
  elite: "Élite",
  signature: "Signature",
};

const EXCL_LABELS: Record<string, string> = {
  none: "Non disponible",
  partial: "Partielle disponible",
  full: "Exclusivité complète",
};

const fmt = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString("fr-CA")}`;

export function DynamicPlanReveal({
  recommendation,
  onCustom,
}: {
  recommendation: Recommendation;
  onCustom: () => void;
}) {
  const navigate = useNavigate();
  const r = recommendation;
  const exclusivityScore =
    r.exclusivity_level === "full" ? 100 : r.exclusivity_level === "partial" ? 65 : 20;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white/70 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[hsl(210,100%,65%)]" />
          Plan IA optimisé pour votre marché
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-3">
          {PLAN_LABELS[r.recommended_plan_slug] ?? r.recommended_plan_slug}
        </h1>
        <div className="flex items-baseline justify-center gap-3">
          <span className="text-6xl font-semibold text-white">{fmt(r.recommended_price_cents)}</span>
          <span className="text-white/50">/mois</span>
        </div>
        {r.price_modifier_pct !== 0 && (
          <div className="text-xs text-white/40 mt-2">
            Base {fmt(r.base_plan_price_cents)} · ajusté {r.price_modifier_pct > 0 ? "+" : ""}
            {r.price_modifier_pct}% selon votre marché
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
      >
        <ScoreRing label="Marché" value={r.market_score} accent="blue" />
        <ScoreRing label="Opportunité" value={r.opportunity_score} accent="emerald" />
        <ScoreRing label="Compétition" value={r.competition_score} accent="rose" />
        <ScoreRing label="Exclusivité" value={exclusivityScore} accent="amber" hint={EXCL_LABELS[r.exclusivity_level]} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="grid md:grid-cols-2 gap-4 mb-8"
      >
        <div className="rounded-[28px] bg-white/[0.04] border border-white/5 p-6 backdrop-blur-md">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Rendez-vous estimés</div>
          <div className="text-3xl font-semibold text-white">
            {r.estimated_monthly_appointments_min}–{r.estimated_monthly_appointments_max}
            <span className="text-base text-white/50"> / mois</span>
          </div>
        </div>
        <div className="rounded-[28px] bg-white/[0.04] border border-white/5 p-6 backdrop-blur-md">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Revenus potentiels</div>
          <div className="text-3xl font-semibold text-white">
            {fmt(r.estimated_revenue_min_cents)}–{fmt(r.estimated_revenue_max_cents)}
            <span className="text-base text-white/50"> / mois</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="rounded-[28px] bg-white/[0.04] border border-white/5 p-6 mb-10"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[hsl(210,100%,65%)]" />
          <div className="text-sm font-medium text-white">Pourquoi ce plan</div>
        </div>
        <ul className="space-y-2">
          {(r.recommendation_reason?.bullets ?? []).map((b, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/75">
              <span className="text-[hsl(210,100%,65%)] mt-0.5">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="space-y-3"
      >
        <Button
          size="lg"
          className="w-full bg-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,70%)] text-black font-medium h-14 rounded-2xl"
          onClick={async () => {
            const { buildCheckoutUrl } = await import("@/lib/checkoutUrl");
            navigate(buildCheckoutUrl({ plan: r.recommended_plan_slug, recommendation: r.id }));
          }}
        >
          Activer ce plan
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={onCustom}
          className="w-full text-white/70 hover:text-white hover:bg-white/5 h-12 rounded-2xl"
        >
          Créer mon plan sur mesure avec Alex
        </Button>
      </motion.div>
    </div>
  );
}
