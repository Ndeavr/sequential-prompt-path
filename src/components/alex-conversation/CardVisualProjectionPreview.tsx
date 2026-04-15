/**
 * CardVisualProjectionPreview — Before/after projection display for renovation.
 */
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import type { VisualProjection } from "@/services/alexVisualIntelligenceEngine";

interface Props {
  projection: VisualProjection;
  roomType: string;
}

export default function CardVisualProjectionPreview({ projection, roomType }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          Projection — {roomType}
        </span>
      </div>

      {/* Style */}
      <div className="text-xs text-muted-foreground">
        Style : <span className="font-medium text-foreground">{projection.styleType}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground leading-relaxed">{projection.description}</p>

      {/* Features */}
      <div className="space-y-1.5">
        {projection.features.map((feature, i) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="flex items-center gap-2 text-xs text-foreground/80"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {feature}
          </motion.div>
        ))}
      </div>

      {/* Estimated cost */}
      {projection.estimatedCost && (
        <div className="pt-1 text-xs text-muted-foreground border-t border-border/20">
          Budget estimé : <span className="font-medium text-foreground">{projection.estimatedCost}</span>
        </div>
      )}
    </motion.div>
  );
}
