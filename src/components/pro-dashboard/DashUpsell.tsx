/**
 * Upsell intelligent — plan-aware
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles, Crown, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { plan: string; }

const UPSELL: Record<string, { icon: any; title: string; desc: string; cta: string; gradient: string }> = {
  recrue: {
    icon: Zap,
    title: "Passez Pro pour recevoir plus de rendez-vous",
    desc: "Accédez aux projets L et augmentez votre visibilité dans votre territoire.",
    cta: "Voir le plan Pro — 49 $/mois",
    gradient: "from-primary/[0.06] to-secondary/[0.03]",
  },
  pro: {
    icon: Star,
    title: "Passez Premium pour accéder aux projets XL",
    desc: "Visibilité prioritaire, badge confiance, auto-acceptation et filtres projets.",
    cta: "Voir le plan Premium — 99 $/mois",
    gradient: "from-primary/[0.08] to-accent/[0.04]",
  },
  premium: {
    icon: Crown,
    title: "Passez Élite pour projets XXL + analytics",
    desc: "Placement prioritaire, statistiques de performance avancées et maximum de rendez-vous.",
    cta: "Voir le plan Élite — 199 $/mois",
    gradient: "from-accent/[0.08] to-primary/[0.04]",
  },
  elite: {
    icon: Sparkles,
    title: "Parlez à l'équipe Signature",
    desc: "Priorité maximale, gestion de compte dédiée, visibilité exclusive dans votre marché.",
    cta: "Contacter l'équipe — 399 $/mois",
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
