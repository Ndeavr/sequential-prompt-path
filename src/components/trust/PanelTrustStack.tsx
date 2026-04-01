/**
 * UNPRO — PanelTrustStack
 * Global trust proof panel — shows badges, AIPP, project count.
 */
import { motion } from "framer-motion";
import { ShieldCheck, Star, Award, Zap } from "lucide-react";
import { fadeUp, viewportOnce } from "@/lib/motion";

interface Props {
  aippScore?: number;
  projectsCompleted?: number;
  reviewCount?: number;
  isVerified?: boolean;
  compact?: boolean;
}

export default function PanelTrustStack({
  aippScore,
  projectsCompleted,
  reviewCount,
  isVerified,
  compact = false,
}: Props) {
  const items = [
    isVerified && {
      icon: ShieldCheck,
      label: "Validé par UNPRO",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    aippScore != null && {
      icon: Award,
      label: `Score AIPP: ${aippScore}/100`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    projectsCompleted != null && {
      icon: Zap,
      label: `${projectsCompleted} projets réalisés`,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    reviewCount != null && {
      icon: Star,
      label: `${reviewCount} avis vérifiés`,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    },
  ].filter(Boolean) as Array<{
    icon: typeof ShieldCheck;
    label: string;
    color: string;
    bg: string;
  }>;

  if (items.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${item.bg} ${item.color}`}
          >
            <item.icon className="h-3 w-3" />
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="glass-card rounded-2xl p-5 space-y-3"
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Confiance & Preuves
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`rounded-lg p-1.5 ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <span className="text-xs text-foreground font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
