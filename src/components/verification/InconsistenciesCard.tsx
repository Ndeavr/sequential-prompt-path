/**
 * InconsistenciesCard — Displays detected inconsistencies, or a clean empty state.
 */
import { motion } from "framer-motion";
import { XCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  inconsistencies: string[];
  loading?: boolean;
}

export default function InconsistenciesCard({ inconsistencies, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/80 p-5 space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  if (inconsistencies.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <p className="text-sm">Aucune incohérence majeure détectée à partir des données disponibles.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5"
    >
      <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <XCircle className="w-3.5 h-3.5" /> Incohérences détectées
      </h3>
      <ul className="space-y-1.5">
        {inconsistencies.map((inc, i) => (
          <li key={i} className="text-sm text-foreground flex items-start gap-2">
            <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
            {inc}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
