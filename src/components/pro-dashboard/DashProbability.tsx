/**
 * Probabilité de rendez-vous cette semaine
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Gauge, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  completeness: number;
  plan: string;
  aipp: number;
}

export default function DashProbability({ completeness, plan, aipp }: Props) {
  // Score based on profile + plan + aipp
  const planBonus = plan === "signature" ? 30 : plan === "elite" ? 25 : plan === "premium" ? 20 : plan === "pro" ? 12 : 5;
  const raw = Math.min(98, Math.round(completeness * 0.4 + aipp * 0.3 + planBonus));
  const level = raw >= 80 ? "Très élevée" : raw >= 60 ? "Élevée" : raw >= 40 ? "Moyenne" : "Faible";
  const levelColor = raw >= 80 ? "text-success" : raw >= 60 ? "text-primary" : raw >= 40 ? "text-warning" : "text-destructive";
  const barColor = raw >= 80 ? "from-success to-emerald-400" : raw >= 60 ? "from-primary to-accent" : raw >= 40 ? "from-warning to-amber-400" : "from-destructive to-red-400";

  const reasons: string[] = [];
  if (completeness >= 80) reasons.push("profil complet");
  if (plan !== "recrue") reasons.push(`plan ${plan}`);
  if (aipp >= 60) reasons.push("bon score AIPP");
  if (completeness < 60) reasons.push("profil incomplet (–)");
  if (plan === "recrue") reasons.push("plan Recrue limité (–)");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.45 }}
      className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/70 to-primary/[0.03] backdrop-blur-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Chances de rendez-vous cette semaine
          </span>
        </div>
        <span className={`text-sm font-bold ${levelColor}`}>{level}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle cx="32" cy="32" r="27" fill="none" stroke="hsl(var(--muted)/0.15)" strokeWidth="5" />
            <circle cx="32" cy="32" r="27" fill="none" stroke="url(#probGrad)" strokeWidth="5"
              strokeDasharray={2 * Math.PI * 27} strokeDashoffset={2 * Math.PI * 27 * (1 - raw / 100)}
              strokeLinecap="round" />
            <defs>
              <linearGradient id="probGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">{raw}%</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
              initial={{ width: 0 }} animate={{ width: `${raw}%` }}
              transition={{ delay: 0.6, duration: 0.8 }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {reasons.length > 0
              ? `Basé sur : ${reasons.join(", ")}.`
              : "Complétez votre profil pour améliorer vos chances."
            }
          </p>
        </div>
      </div>

      <Link to="/pro/profile">
        <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5">
          Améliorer mes chances <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </motion.div>
  );
}
