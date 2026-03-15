/**
 * RisksCard — Displays an array of risk signals.
 */
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  risks: string[];
  loading?: boolean;
}

export default function RisksCard({ risks, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  if (risks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-2xl border border-warning/20 bg-warning/5 p-5"
    >
      <h3 className="text-xs font-semibold text-warning uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" /> Signaux d'attention
      </h3>
      <ul className="space-y-1.5">
        {risks.map((r, i) => (
          <li key={i} className="text-sm text-foreground flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
            {r}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
