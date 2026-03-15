/**
 * StrengthsCard — Displays an array of verified strengths.
 */
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  strengths: string[];
  loading?: boolean;
}

export default function StrengthsCard({ strengths, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-success/20 bg-success/5 p-5 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }

  if (strengths.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-success/20 bg-success/5 p-5"
    >
      <h3 className="text-xs font-semibold text-success uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> Points forts
      </h3>
      <ul className="space-y-1.5">
        {strengths.map((s, i) => (
          <li key={i} className="text-sm text-foreground flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
            {s}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
