/**
 * UnproTrustScoreCard — Displays the UnPRO Public Trust Score with badge.
 */
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  score: number;
  loading?: boolean;
}

function getBadge(score: number) {
  if (score >= 80) return { label: "Solide", icon: ShieldCheck, className: "bg-success/10 text-success border-success/20" };
  if (score >= 60) return { label: "Encourageant", icon: Shield, className: "bg-primary/10 text-primary border-primary/20" };
  if (score >= 40) return { label: "Prudence", icon: AlertTriangle, className: "bg-warning/10 text-warning border-warning/20" };
  return { label: "Risque élevé", icon: ShieldAlert, className: "bg-destructive/10 text-destructive border-destructive/20" };
}

export default function UnproTrustScoreCard({ score, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-5 w-20 mb-3" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, score));
  const badge = getBadge(clamped);
  const Icon = badge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Indice UNPRO
      </p>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold font-display text-foreground">{clamped}</span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>

      <Badge variant="outline" className={`gap-1.5 ${badge.className}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </Badge>

      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        Score estimatif basé sur les données publiques détectées. Ce score ne constitue pas une certification légale.
      </p>
    </motion.div>
  );
}
