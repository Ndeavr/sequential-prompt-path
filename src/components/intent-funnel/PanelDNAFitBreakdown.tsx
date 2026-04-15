/**
 * PanelDNAFitBreakdown — Radar-style breakdown of DNA match dimensions.
 */
import { motion } from "framer-motion";
import type { DNABreakdown } from "@/hooks/useIntentFunnel";

interface Props {
  breakdown: DNABreakdown;
  contractorName: string;
}

const DIMENSIONS = [
  { key: "service_fit" as const, label: "Service", weight: "30%" },
  { key: "region" as const, label: "Région", weight: "25%" },
  { key: "availability" as const, label: "Disponibilité", weight: "20%" },
  { key: "reviews" as const, label: "Avis", weight: "15%" },
  { key: "language" as const, label: "Langue", weight: "10%" },
];

export default function PanelDNAFitBreakdown({ breakdown, contractorName }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">Compatibilité ADN</h3>
      <p className="text-xs text-muted-foreground mb-4">{contractorName}</p>

      <div className="space-y-3">
        {DIMENSIONS.map((d) => {
          const value = breakdown[d.key];
          const pct = Math.round(value * 100);

          return (
            <div key={d.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{d.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/60">{d.weight}</span>
                  <span className="text-xs font-semibold text-foreground">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className={`h-full rounded-full ${
                    pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-primary" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Score global</span>
          <span className="text-sm font-bold text-primary">
            {Math.round(
              breakdown.service_fit * 30 +
              breakdown.region * 25 +
              breakdown.availability * 20 +
              breakdown.reviews * 15 +
              breakdown.language * 10
            )}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
