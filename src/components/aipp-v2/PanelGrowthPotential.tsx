import { motion } from "framer-motion";
import { TrendingUp, Sparkles } from "lucide-react";

interface Props {
  currentScore: number;
  potentialScore: number;
}

export default function PanelGrowthPotential({ currentScore, potentialScore }: Props) {
  const improvement = potentialScore - currentScore;
  const circumference = 2 * Math.PI * 50;
  const currentOffset = circumference - (currentScore / 100) * circumference;
  const potentialOffset = circumference - (potentialScore / 100) * circumference;

  return (
    <div className="bg-gradient-to-br from-primary/10 via-card to-green-500/5 border border-primary/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Potentiel de croissance avec UNPRO</h3>
      </div>

      <div className="flex items-center justify-center gap-8 mb-4">
        {/* Current score ring */}
        <div className="text-center">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <motion.circle
                cx="60" cy="60" r="50" fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: currentOffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-muted-foreground">{currentScore}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Actuel</p>
        </div>

        {/* Arrow */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <TrendingUp className="w-6 h-6 text-green-500" />
          <span className="text-xs font-bold text-green-500 mt-1">+{improvement}</span>
        </motion.div>

        {/* Potential score ring */}
        <div className="text-center">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <motion.circle
                cx="60" cy="60" r="50" fill="none"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: potentialOffset }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-xl font-bold text-green-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                {potentialScore}
              </motion.span>
            </div>
          </div>
          <p className="text-[10px] text-green-500 font-medium mt-1">Avec UNPRO</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Score projeté basé sur l'optimisation IA, la présence locale renforcée et les conversions automatisées.
      </p>
    </div>
  );
}
