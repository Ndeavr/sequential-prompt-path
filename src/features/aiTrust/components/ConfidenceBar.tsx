/**
 * UNPRO AI Trust — ConfidenceBar
 * Displays an AI confidence score (0-1) as a calibrated bar.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  value: number; // 0..1
  label?: string;
  className?: string;
}

export default function ConfidenceBar({ value, label, className }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const tone =
    pct >= 75 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {label ?? "Confiance IA"}
        </span>
        <span className="text-xs font-mono text-foreground">{pct.toFixed(0)}%</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cn("absolute inset-y-0 left-0 rounded-full", tone)}
        />
      </div>
    </div>
  );
}
