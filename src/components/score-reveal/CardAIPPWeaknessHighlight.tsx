/**
 * CardAIPPWeaknessHighlight — Highlights the main weakness.
 */
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface Props {
  weakness: string;
  description: string;
  impactLabel: string;
  visible: boolean;
}

export default function CardAIPPWeaknessHighlight({ weakness, description, impactLabel, visible }: Props) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 space-y-2"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-destructive" />
        <span className="text-sm font-bold text-destructive">Point faible principal</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{weakness}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-[10px] font-medium text-destructive">
        Impact : {impactLabel}
      </div>
    </motion.div>
  );
}
