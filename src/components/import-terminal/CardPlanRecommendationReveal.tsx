/**
 * CardPlanRecommendationReveal — Animated plan recommendation reveal.
 */
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  planName?: string;
  reason?: string;
  revealed: boolean;
  onActivate?: () => void;
}

export default function CardPlanRecommendationReveal({ planName, reason, revealed, onActivate }: Props) {
  if (!revealed || !planName) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-emerald-500/20 p-5 space-y-4"
      style={{ background: "linear-gradient(135deg, hsl(160 25% 5%) 0%, hsl(180 30% 4%) 100%)" }}
    >
      <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
        <Zap className="w-4 h-4" /> Plan recommandé
      </h3>
      <div>
        <p className="text-2xl font-bold text-foreground">{planName}</p>
        {reason && <p className="text-xs text-muted-foreground mt-1">{reason}</p>}
      </div>
      {onActivate && (
        <Button onClick={onActivate} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
          Activer ce plan <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
}
