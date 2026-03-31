/**
 * TableCompetitorComparison — Side-by-side comparison of UNPRO vs traditional methods.
 */
import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  feature: string;
  traditional: "yes" | "no" | "partial";
  unpro: "yes" | "no" | "partial";
}

const DEFAULT_ROWS: ComparisonRow[] = [
  { feature: "Rendez-vous garantis", traditional: "no", unpro: "yes" },
  { feature: "Matching IA intelligent", traditional: "no", unpro: "yes" },
  { feature: "Profil optimisé automatiquement", traditional: "no", unpro: "yes" },
  { feature: "Score de confiance vérifié", traditional: "no", unpro: "yes" },
  { feature: "Coût prévisible", traditional: "no", unpro: "yes" },
  { feature: "Pas de CPC variable", traditional: "no", unpro: "yes" },
  { feature: "Prise de rendez-vous directe", traditional: "partial", unpro: "yes" },
  { feature: "Visibilité IA / AEO", traditional: "no", unpro: "yes" },
  { feature: "Gestion des avis intégrée", traditional: "partial", unpro: "yes" },
  { feature: "Zéro compétition sur votre page", traditional: "no", unpro: "yes" },
];

const StatusIcon = ({ status }: { status: "yes" | "no" | "partial" }) => {
  if (status === "yes") return <Check className="w-4 h-4 text-green-500" />;
  if (status === "no") return <X className="w-4 h-4 text-destructive/60" />;
  return <Minus className="w-4 h-4 text-amber-500" />;
};

interface Props {
  rows?: ComparisonRow[];
  className?: string;
}

export default function TableCompetitorComparison({ rows = DEFAULT_ROWS, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card rounded-2xl overflow-hidden", className)}
    >
      {/* Header */}
      <div className="grid grid-cols-[1fr_64px_64px] gap-2 px-4 py-3 bg-muted/30 border-b border-border/30">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider" />
        <div className="text-[10px] font-bold text-muted-foreground text-center uppercase">Trad.</div>
        <div className="text-[10px] font-bold text-primary text-center uppercase">UNPRO</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/20">
        {rows.map((row, i) => (
          <motion.div
            key={row.feature}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.03 * i }}
            className="grid grid-cols-[1fr_64px_64px] gap-2 px-4 py-2.5 items-center"
          >
            <span className="text-xs text-foreground/80">{row.feature}</span>
            <div className="flex justify-center">
              <StatusIcon status={row.traditional} />
            </div>
            <div className="flex justify-center">
              <StatusIcon status={row.unpro} />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
