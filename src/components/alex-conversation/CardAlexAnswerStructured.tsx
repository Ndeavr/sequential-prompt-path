/**
 * CardAlexAnswerStructured — Renders a 4-block structured answer with visual hierarchy.
 */
import { motion } from "framer-motion";
import { Lightbulb, MapPin, ArrowRight } from "lucide-react";
import type { StructuredAnswer } from "@/services/alexCognitiveRulesEngine";
import BadgeContextUsed from "./BadgeContextUsed";
import BadgeConfidenceScore from "./BadgeConfidenceScore";

interface Props {
  answer: StructuredAnswer;
  showBadges?: boolean;
}

export default function CardAlexAnswerStructured({ answer, showBadges = true }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      {/* Badges */}
      {showBadges && (
        <div className="flex items-center gap-2 flex-wrap">
          {answer.context && <BadgeContextUsed />}
          <BadgeConfidenceScore score={answer.confidenceScore} />
        </div>
      )}

      {/* Block 1: Comprehension */}
      <p className="text-foreground font-medium">{answer.comprehension}</p>

      {/* Block 2: Useful Answer */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <p>{answer.usefulAnswer}</p>
      </div>

      {/* Block 3: Context (optional) */}
      {answer.context && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground/80 pl-1">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>{answer.context}</p>
        </div>
      )}

      {/* Block 4: Action */}
      <div className="flex items-center gap-2 text-sm font-medium text-primary pt-1">
        <ArrowRight className="w-4 h-4 shrink-0" />
        <p>{answer.action}</p>
      </div>
    </motion.div>
  );
}
