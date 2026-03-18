/**
 * Dashboard Hero — Profile status + completion bar
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { MapPin, Crown, Sparkles, Edit } from "lucide-react";

const f = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } },
});

const tier = (s: number) => s >= 80 ? "Élite" : s >= 60 ? "Gold" : s >= 40 ? "Silver" : "Bronze";
const tierGrad = (s: number) => s >= 80 ? "from-primary to-accent" : s >= 60 ? "from-yellow-500 to-amber-400" : s >= 40 ? "from-slate-400 to-slate-300" : "from-amber-700 to-amber-500";

interface Props {
  profile: any;
  completeness: number;
  aipp: number;
}

export default function DashHero({ profile, completeness, aipp }: Props) {
  const t = tier(aipp);
  const statusLabel = completeness >= 90 ? "Actif" : completeness >= 50 ? "En cours" : "Incomplet";
  const statusColor = completeness >= 90 ? "bg-success" : completeness >= 50 ? "bg-warning" : "bg-destructive";

  return (
    <motion.div {...f(0)} className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-primary/[0.04] backdrop-blur-xl p-5 shadow-[var(--shadow-lg)]">
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tierGrad(aipp)} flex items-center justify-center text-white font-bold text-xl shadow-[var(--shadow-glow)] flex-shrink-0`}>
          {profile?.business_name?.charAt(0) || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            Bienvenue sur UNPRO
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completeness >= 90
              ? "Votre profil est actif et prêt à recevoir des rendez-vous."
              : "Votre profil est en cours d'activation."
            }
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${statusColor}`}>
              {statusLabel}
            </span>
            {profile?.city && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="w-3 h-3" /> {profile.city}
              </span>
            )}
          </div>
        </div>
        <Link to="/pro/profile">
          <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1">
            <Edit className="w-3 h-3" /> Modifier
          </Button>
        </Link>
      </div>

      {/* Completion bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Complétion du profil</span>
          <span className="text-sm font-bold text-primary">{completeness}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${completeness}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Score + Tier */}
      <div className="flex items-center gap-4 mt-4">
        <div className="relative w-12 h-12">
          <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--muted)/0.2)" strokeWidth="3" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
              strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - aipp / 100)}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{aipp}</span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Score AIPP</p>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${tierGrad(aipp)} text-white text-[9px] font-bold uppercase tracking-wider`}>
            <Crown className="w-2.5 h-2.5" /> {t}
          </div>
        </div>
        <div className="h-8 w-px bg-border/30" />
        <div>
          <p className="text-xs font-semibold text-foreground">{profile?.business_name || "Mon entreprise"}</p>
          <p className="text-[10px] text-muted-foreground">{profile?.specialty || "Spécialité non définie"}</p>
        </div>
      </div>
    </motion.div>
  );
}
