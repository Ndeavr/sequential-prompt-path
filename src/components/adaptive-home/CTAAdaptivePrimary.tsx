/**
 * CTAAdaptivePrimary — CTA button that adapts label and style based on conversion stage.
 */
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { type ConversionStage } from "@/hooks/useAdaptiveSession";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  onClick: () => void;
  stage: ConversionStage;
}

export default function CTAAdaptivePrimary({ label, onClick, stage }: Props) {
  const isConverted = stage === "converted";

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={isConverted}
      className={cn(
        "inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200",
        stage === "idle" && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
        stage === "selected" && "bg-primary text-primary-foreground shadow-xl shadow-primary/30 ring-2 ring-primary/20",
        stage === "engaged" && "bg-primary text-primary-foreground shadow-xl shadow-primary/40 animate-pulse",
        isConverted && "bg-muted text-muted-foreground cursor-default",
      )}
    >
      {label}
      {isConverted ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
    </motion.button>
  );
}
