/**
 * Upsell intelligent — plan-aware
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles, Crown, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CONTRACTOR_OBJECTIVE_CTA,
  contractorPlanLink,
  type ContractorObjective,
} from "@/lib/routing/contractorPlanRoute";

interface Props { plan: string; }

/**
 * Aucun prix n'est écrit ici : le montant réel vient du plan personnalisé,
 * calculé à partir du profil de l'entrepreneur.
 */
const UPSELL: Record<
  string,
  { icon: any; title: string; desc: string; objective: ContractorObjective; gradient: string }
> = {
  recrue: {
    icon: Zap,
    title: "Recevez plus de rendez-vous exclusifs",
    desc: "Votre plan tient compte de vos services, de votre territoire et de votre capacité réelle.",
    objective: "more_appointments",
    gradient: "from-primary/[0.06] to-secondary/[0.03]",
  },
  pro: {
    icon: Star,
    title: "Élargissez votre territoire",
    desc: "Couvrez plus de zones là où la demande est réellement présente.",
    objective: "territory",
    gradient: "from-primary/[0.08] to-accent/[0.04]",
  },
  premium: {
    icon: Crown,
    title: "Améliorez votre visibilité IA",
    desc: "Renforcez les éléments qui font que votre entreprise est comprise et recommandée.",
    objective: "visibility",
    gradient: "from-accent/[0.08] to-primary/[0.04]",
  },
  elite: {
    icon: Sparkles,
    title: "Ajustez votre plan à vos objectifs",
    desc: "Priorité maximale, visibilité exclusive dans votre marché, selon votre capacité.",
    objective: "upgrade",
    gradient: "from-primary/[0.10] to-secondary/[0.06]",
  },
};

export default function DashUpsell({ plan }: Props) {
  const cfg = UPSELL[plan] ?? UPSELL.recrue;
  if (plan === "signature") return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
      className={`rounded-2xl border border-primary/20 bg-gradient-to-br ${cfg.gradient} backdrop-blur-xl p-5 space-y-3 shadow-[var(--shadow-glow)]`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-md">
          <cfg.icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{cfg.title}</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{cfg.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/pricing" className="flex-1">
          <Button size="sm" className="w-full bg-gradient-to-r from-primary to-secondary text-white border-0 rounded-xl h-9 text-xs font-bold hover:brightness-110 hover:shadow-[var(--shadow-glow)] transition-all gap-1.5">
            <ArrowUpRight className="w-3 h-3" /> {cfg.cta}
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
