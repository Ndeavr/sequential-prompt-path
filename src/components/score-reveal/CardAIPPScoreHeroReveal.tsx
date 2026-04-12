/**
 * CardAIPPScoreHeroReveal — The main hero card that reveals the score.
 */
import { motion } from "framer-motion";
import WidgetScoreDigitsFlipReveal from "./WidgetScoreDigitsFlipReveal";
import WidgetAIPPScoreGaugeReveal from "./WidgetAIPPScoreGaugeReveal";
import WidgetRevealPulseRing from "./WidgetRevealPulseRing";

interface Props {
  score: number;
  revealed: boolean;
  businessName?: string;
}

export default function CardAIPPScoreHeroReveal({ score, revealed, businessName }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-4"
    >
      {businessName && (
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Score AIPP — {businessName}
        </p>
      )}

      <WidgetRevealPulseRing active={!revealed}>
        <WidgetAIPPScoreGaugeReveal score={score} revealed={revealed} size={180} />
      </WidgetRevealPulseRing>

      <WidgetScoreDigitsFlipReveal targetScore={score} revealed={revealed} />

      {revealed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-xs text-muted-foreground"
        >
          AI-Indexed Professional Profile
        </motion.p>
      )}
    </motion.div>
  );
}
