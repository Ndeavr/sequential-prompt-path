import { motion } from "framer-motion";
import { Award } from "lucide-react";

interface Props {
  entityName: string;
  score: number;
  tier: string;
}

export default function CardAIPPScore({ entityName, score, tier }: Props) {
  const tierColors: Record<string, string> = {
    elite: "from-amber-400 to-amber-600",
    authority: "from-purple-400 to-purple-600",
    gold: "from-yellow-400 to-yellow-600",
    silver: "from-gray-300 to-gray-500",
    bronze: "from-orange-300 to-orange-500",
  };
  const gradient = tierColors[tier] || tierColors.silver;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          <Award className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Score AIPP</p>
          <p className="text-sm font-semibold text-foreground truncate">{entityName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-foreground">{score}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium bg-gradient-to-r ${gradient} text-white capitalize`}>
              {tier}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
