/**
 * CardPhotoRequestContextual — Smart photo request with benefit explanation.
 */
import { motion } from "framer-motion";
import { Camera, ArrowRight } from "lucide-react";
import type { PhotoPromptDecision } from "@/services/alexVisualIntelligenceEngine";

interface Props {
  decision: PhotoPromptDecision;
  onUpload?: () => void;
  onSkip?: () => void;
}

export default function CardPhotoRequestContextual({ decision, onUpload, onSkip }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{decision.promptMessage}</p>
          <p className="text-xs text-muted-foreground">
            Bénéfice : {decision.benefit}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUpload}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Camera className="w-4 h-4" />
          Envoyer une photo
        </button>
        <button
          onClick={onSkip}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border/50 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Continuer sans photo
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
