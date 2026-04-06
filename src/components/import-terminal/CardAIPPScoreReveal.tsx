/**
 * CardAIPPScoreReveal — Animated AIPP score reveal.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import type { ImportData } from "@/hooks/useTerminalImportAnimation";

interface Props {
  data: ImportData;
  revealed: boolean;
}

export default function CardAIPPScoreReveal({ data, revealed }: Props) {
  const [displayScore, setDisplayScore] = useState(0);
  const targetScore = data.aippScore ?? 0;

  useEffect(() => {
    if (!revealed || !targetScore) return;
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * targetScore));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [revealed, targetScore]);

  if (!revealed) return null;

  const tier = targetScore >= 90 ? "Élite" : targetScore >= 75 ? "Autorité" : targetScore >= 60 ? "Or" : targetScore >= 40 ? "Argent" : "Bronze";
  const tierColor = targetScore >= 75 ? "text-emerald-300" : targetScore >= 50 ? "text-amber-300" : "text-orange-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-emerald-500/20 p-5 space-y-4"
      style={{ background: "linear-gradient(135deg, hsl(160 25% 5%) 0%, hsl(160 35% 3%) 100%)" }}
    >
      <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" /> Score AIPP
      </h3>
      <div className="flex items-end gap-3">
        <span className="text-5xl font-black tabular-nums text-emerald-200">{displayScore}</span>
        <span className="text-lg text-emerald-500/60 mb-1">/100</span>
        <span className={`text-sm font-semibold ${tierColor} mb-1.5 ml-auto`}>{tier}</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-emerald-900/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-300"
          initial={{ width: 0 }}
          animate={{ width: `${targetScore}%` }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {/* Dimensions */}
      {data.aippDimensions && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono text-emerald-400/70">
          {Object.entries(data.aippDimensions).map(([dim, val]) => (
            <div key={dim} className="flex justify-between">
              <span className="truncate">{dim}</span>
              <span className="text-emerald-300 font-semibold">{val}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
