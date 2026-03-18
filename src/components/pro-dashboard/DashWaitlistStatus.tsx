/**
 * DashWaitlistStatus — Contractor performance status + waitlist position widget
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, TrendingUp, Clock, ArrowRight, ChevronRight, Eye, EyeOff } from "lucide-react";
import {
  useContractorLiveScore,
  useRefreshLiveScore,
  useContractorWaitlistEntries,
  getStatusLabel,
  getWaitlistStatusLabel,
} from "@/hooks/useWaitlistSystem";

const f = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } },
});

const ScoreBar = ({ label, value, max = 100 }: { label: string; value: number; max?: number }) => {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "from-success to-emerald-400" : pct >= 40 ? "from-warning to-amber-400" : "from-destructive to-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.3, duration: 0.6 }}
        />
      </div>
    </div>
  );
};

export default function DashWaitlistStatus() {
  const { data: liveScore, isLoading: lsLoading } = useContractorLiveScore();
  const { data: waitlistEntries } = useContractorWaitlistEntries();
  const refreshScore = useRefreshLiveScore();

  const status = liveScore ? getStatusLabel(liveScore.status) : null;

  return (
    <div className="space-y-4">
      {/* Performance Score Card */}
      <motion.div {...f(0)} className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-primary/[0.04] backdrop-blur-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Score de performance</span>
          </div>
          {status && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
              {status.label}
            </span>
          )}
        </div>

        {liveScore ? (
          <>
            {/* Composite Score Circle */}
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="hsl(var(--muted)/0.15)" strokeWidth="5" />
                  <circle cx="32" cy="32" r="27" fill="none" stroke="url(#perfGrad)" strokeWidth="5"
                    strokeDasharray={2 * Math.PI * 27} strokeDashoffset={2 * Math.PI * 27 * (1 - (liveScore.composite_score ?? 0) / 100)}
                    strokeLinecap="round" />
                  <defs>
                    <linearGradient id="perfGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                  {Math.round(liveScore.composite_score ?? 0)}
                </span>
              </div>

              <div className="flex-1 space-y-2">
                {liveScore.risk_level === "critical" && (
                  <div className="flex items-center gap-1.5 text-destructive text-[11px] font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    Votre position est menacée. Améliorez votre score.
                  </div>
                )}
                {liveScore.risk_level === "high" && (
                  <div className="flex items-center gap-1.5 text-warning text-[11px] font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    Score faible. Risque de surveillance.
                  </div>
                )}
                {liveScore.risk_level === "medium" && (
                  <div className="flex items-center gap-1.5 text-warning text-[11px] font-medium">
                    <Eye className="w-3 h-3" />
                    Sous surveillance. Restez actif.
                  </div>
                )}
                {(liveScore.risk_level === "none" || !liveScore.risk_level) && (
                  <div className="flex items-center gap-1.5 text-success text-[11px] font-medium">
                    <TrendingUp className="w-3 h-3" />
                    Bonne performance. Continuez!
                  </div>
                )}
                {liveScore.visibility_reduced && (
                  <div className="flex items-center gap-1.5 text-destructive/80 text-[10px]">
                    <EyeOff className="w-3 h-3" />
                    Visibilité réduite
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ScoreBar label="Réactivité" value={liveScore.response_rate ?? 0} />
              <ScoreBar label="Taux de réservation" value={liveScore.booking_rate ?? 0} />
              <ScoreBar label="Taux d'acceptation" value={liveScore.acceptance_rate ?? 0} />
              <ScoreBar label="Évaluation clients" value={liveScore.client_rating ?? 0} />
              <ScoreBar label="Fréquence d'activité" value={liveScore.activity_frequency ?? 0} />
              <ScoreBar label="Qualité du profil" value={liveScore.profile_quality_score ?? 0} />
            </div>

            {/* Suggestions */}
            {(liveScore.composite_score ?? 0) < 60 && (
              <div className="space-y-1.5 pt-2 border-t border-border/20">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Suggestions d'amélioration</p>
                <ul className="space-y-1">
                  {(liveScore.response_rate ?? 0) < 50 && (
                    <li className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-primary" /> Répondez plus rapidement aux demandes
                    </li>
                  )}
                  {(liveScore.booking_rate ?? 0) < 40 && (
                    <li className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-primary" /> Augmentez votre taux de réservation
                    </li>
                  )}
                  {(liveScore.profile_quality_score ?? 0) < 60 && (
                    <li className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-primary" /> Complétez votre profil pour plus de crédibilité
                    </li>
                  )}
                  {(liveScore.activity_frequency ?? 0) < 50 && (
                    <li className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-primary" /> Restez actif sur la plateforme chaque semaine
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 space-y-2">
            <p className="text-xs text-muted-foreground">Aucun score calculé pour le moment.</p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-8 text-xs"
              onClick={() => refreshScore.mutate()}
              disabled={refreshScore.isPending}
            >
              {refreshScore.isPending ? "Calcul..." : "Calculer mon score"}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Waitlist Entries */}
      {waitlistEntries && waitlistEntries.length > 0 && (
        <motion.div {...f(1)} className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-secondary/[0.04] backdrop-blur-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Liste d'attente</span>
          </div>

          <div className="space-y-2">
            {waitlistEntries.map((entry: any) => {
              const wlStatus = getWaitlistStatusLabel(entry.waitlist_score ?? 0);
              const territory = entry.territories;
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/20">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {territory?.city_name ?? "—"} · {territory?.category_name ?? "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Score : {Math.round(entry.waitlist_score ?? 0)} / 100
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${wlStatus.color} whitespace-nowrap`}>
                    {wlStatus.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Améliorez votre profil et votre score AIPP pour monter dans la liste d'attente.
          </p>

          <Link to="/pro/profile">
            <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5">
              Améliorer mes chances <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
