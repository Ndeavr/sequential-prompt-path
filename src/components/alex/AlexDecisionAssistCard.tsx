/**
 * AlexDecisionAssistCard — Helps user decide without overloading.
 * Shows: why this pro, project fit, delay, verification, availability.
 */
import { motion } from "framer-motion";
import { Shield, Clock, Star, CheckCircle2 } from "lucide-react";
import type { PredictiveMatch } from "@/services/alexPredictiveMatchEngine";

interface Props {
  match: PredictiveMatch;
  className?: string;
}

export default function AlexDecisionAssistCard({ match, className = "" }: Props) {
  const score = Math.round(match.matchScore * 100);
  const avail = Math.round(match.availabilityScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-card border border-border rounded-2xl p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Star className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{match.businessName}</p>
          <p className="text-xs text-muted-foreground">Match {score}%</p>
        </div>
      </div>

      <div className="space-y-2">
        <Row icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-500" />} label="Pourquoi lui" value={match.explanationSummary} />
        <Row icon={<Clock className="w-3.5 h-3.5 text-amber-500" />} label="Disponibilité" value={`${avail}% — créneaux cette semaine`} />
        <Row icon={<Shield className="w-3.5 h-3.5 text-blue-500" />} label="Vérification" value="Licence + assurance vérifiées" />
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        Pas de soumissions multiples. Un seul pro, le bon.
      </p>
    </motion.div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <span className="text-xs font-medium text-foreground">{label}</span>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
