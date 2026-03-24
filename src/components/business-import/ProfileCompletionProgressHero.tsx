import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface Props {
  percentage: number;
  aippScore: number;
  message?: string;
}

export default function ProfileCompletionProgressHero({ percentage, aippScore, message }: Props) {
  const ringColor = percentage >= 80 ? "hsl(var(--success))" : percentage >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const offset = 264 - (264 * percentage) / 100;

  return (
    <motion.div
      className="bg-gradient-to-br from-primary/8 via-background to-secondary/5 rounded-2xl p-5 text-center space-y-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-center gap-6">
        {/* Completion ring */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none"
              stroke={ringColor}
              strokeWidth="7" strokeLinecap="round"
              strokeDasharray={264}
              initial={{ strokeDashoffset: 264 }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-foreground">{percentage}%</span>
            <span className="text-[9px] text-muted-foreground">Complet</span>
          </div>
        </div>

        {/* AIPP score */}
        <div className="text-left">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Score AIPP
          </div>
          <p className="text-2xl font-black text-foreground">{aippScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {message || "Votre profil peut être prêt en quelques minutes."}
      </p>
    </motion.div>
  );
}
