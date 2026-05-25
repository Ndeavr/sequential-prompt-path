/**
 * <SmartRecommendationCard> — dashboard-ready recommendation card with variants.
 */
import { ArrowRight, TrendingUp, AlertTriangle, Sparkles, Eye, MapPin, Crown, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { SmartRecommendationKind } from "@/features/smartContext/types";

const VARIANTS: Record<
  SmartRecommendationKind,
  { label: string; icon: typeof Sparkles; tone: string; glow: string }
> = {
  recommended:       { label: "Recommandé",        icon: Sparkles,      tone: "text-primary",       glow: "from-primary/10 to-transparent" },
  not_recommended:   { label: "À éviter",          icon: X,             tone: "text-destructive",   glow: "from-destructive/10 to-transparent" },
  upgrade:           { label: "Optimisation",      icon: TrendingUp,    tone: "text-amber-500",     glow: "from-amber-500/10 to-transparent" },
  opportunity:       { label: "Opportunité",       icon: TrendingUp,    tone: "text-emerald-500",   glow: "from-emerald-500/10 to-transparent" },
  high_demand:       { label: "Forte demande",     icon: MapPin,        tone: "text-cyan-500",      glow: "from-cyan-500/10 to-transparent" },
  visibility:        { label: "Visibilité IA",     icon: Eye,           tone: "text-violet-500",    glow: "from-violet-500/10 to-transparent" },
  capacity_warning:  { label: "Capacité limite",   icon: AlertTriangle, tone: "text-orange-500",    glow: "from-orange-500/10 to-transparent" },
};

interface Props {
  kind: SmartRecommendationKind;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function SmartRecommendationCard({ kind, title, description, ctaLabel, onCta }: Props) {
  const v = VARIANTS[kind];
  const Icon = v.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[24px] border border-border/40 bg-card/80 backdrop-blur-xl p-4"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${v.glow} pointer-events-none`} />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <div className={`rounded-xl bg-card/80 border border-border/40 p-1.5 ${v.tone}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${v.tone}`}>{v.label}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
        {ctaLabel && onCta && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCta}
            className="h-8 rounded-xl text-xs gap-1.5 px-2.5 -ml-2.5"
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default SmartRecommendationCard;
