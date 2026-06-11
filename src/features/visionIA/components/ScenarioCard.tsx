import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import type { ScenarioData } from "../types";

interface Props {
  kind: "no_change" | "growth" | "unpro";
  data: ScenarioData;
  index: number;
  onHover?: () => void;
}

const CONFIG = {
  no_change: {
    title: "Si rien ne change",
    icon: TrendingDown,
    accent: "text-amber-400",
    border: "border-amber-400/20",
  },
  growth: {
    title: "Croissance naturelle",
    icon: TrendingUp,
    accent: "text-emerald-400",
    border: "border-emerald-400/20",
  },
  unpro: {
    title: "Entreprise optimisée UNPRO",
    icon: Sparkles,
    accent: "text-cyan-300",
    border: "border-cyan-300/30",
  },
};

export default function ScenarioCard({ kind, data, index, onHover }: Props) {
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;
  const items = data.risks ?? data.gains ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onMouseEnter={onHover}
      className={`glass-strong rounded-[28px] p-5 border ${cfg.border} flex flex-col gap-3`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${cfg.accent}`} />
        <h3 className="text-readable font-semibold text-base">{cfg.title}</h3>
      </div>
      {data.summary && (
        <p className="text-readable-body text-sm leading-relaxed">{data.summary}</p>
      )}
      {items.length > 0 && (
        <ul className="space-y-1.5 mt-1">
          {items.map((it, i) => (
            <li key={i} className="text-readable-body text-sm flex gap-2">
              <span className={cfg.accent}>•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
      {data.projection_5y && (
        <p className="text-readable-muted text-xs italic mt-2 pt-3 border-t border-white/5">
          Dans 5 ans : {data.projection_5y}
        </p>
      )}
    </motion.div>
  );
}
