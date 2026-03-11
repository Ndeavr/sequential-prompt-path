import { motion, AnimatePresence } from "framer-motion";
import type { FlywheelNodeData } from "./flywheelData";
import { ArrowRight } from "lucide-react";

interface Props {
  node: FlywheelNodeData | null;
}

export const FlywheelDetailCard = ({ node }: Props) => (
  <AnimatePresence mode="wait">
    {node && (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl p-5 md:p-6"
        style={{
          boxShadow: `0 0 32px -8px hsl(${node.glowColor} / 0.1), 0 4px 16px -4px hsl(0 0% 0% / 0.15)`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border border-border/30`}
            style={{ background: `hsl(${node.glowColor} / 0.1)` }}
          >
            <node.icon className={`w-4 h-4 ${node.colorClass}`} />
          </div>
          <h3 className="font-display text-body-lg font-semibold text-foreground">
            {node.label}
          </h3>
        </div>

        <p className="text-body text-muted-foreground mb-4 leading-relaxed">
          {node.detail}
        </p>

        <div className="border-t border-border/30 pt-3 space-y-2">
          <p className="text-caption uppercase tracking-widest text-muted-foreground font-semibold">
            Pourquoi c'est important
          </p>
          <p className="text-meta text-foreground/80">{node.whyItMatters}</p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-success" />
          <span className="text-meta font-semibold text-success">{node.metric}</span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
