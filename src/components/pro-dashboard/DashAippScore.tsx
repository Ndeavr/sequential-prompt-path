/**
 * Score AIPP card
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";

interface Props { aipp: number; completeness: number; profile: any; }

const pillars = (c: number, a: number, p: any) => [
  { label: "Profil complété", pct: c },
  { label: "Avis clients", pct: Math.min(100, (p?.rating ?? 0) * 20) },
  { label: "Performance", pct: Math.min(100, a * 1.1) },
  { label: "Réactivité", pct: 40 },
];

export default function DashAippScore({ aipp, completeness, profile }: Props) {
  const items = pillars(completeness, aipp, profile);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Score AIPP</span>
        </div>
        <Link to="/pro/aipp-score" className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
          Améliorer mon score <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r="23" fill="none" stroke="hsl(var(--muted)/0.15)" strokeWidth="4" />
            <circle cx="28" cy="28" r="23" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
              strokeDasharray={2 * Math.PI * 23} strokeDashoffset={2 * Math.PI * 23 * (1 - aipp / 100)}
              strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">{aipp}</span>
        </div>
        <div className="flex-1 space-y-2">
          {items.map((p, i) => (
            <div key={p.label} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{p.label}</span>
                <span className="text-[10px] font-semibold text-foreground">{Math.round(p.pct)}%</span>
              </div>
              <div className="h-[3px] rounded-full bg-muted/15 overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                  transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
