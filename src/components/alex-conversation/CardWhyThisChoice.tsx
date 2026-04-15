/**
 * CardWhyThisChoice — "Pourquoi ce choix" reasoning card.
 * Animated stack reveal with checkmarks.
 */
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";

interface Props {
  reasons: string[];
  title?: string;
  delay?: number;
}

export default function CardWhyThisChoice({ reasons, title = "Pourquoi ce choix", delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className="w-full max-w-[88%] ml-10 rounded-xl overflow-hidden"
    >
      {/* Glowing border wrapper */}
      <div
        className="p-[1px] rounded-xl"
        style={{
          background: "linear-gradient(135deg, hsl(142 70% 45% / 0.4), hsl(var(--primary) / 0.2), hsl(262 80% 50% / 0.2))",
        }}
      >
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card) / 0.95), hsl(var(--card) / 0.85))",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-400 tracking-wide uppercase">{title}</span>
            </div>
          </div>

          {/* Reason list with staggered animation */}
          <div className="space-y-2">
            {reasons.map((reason, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.15 + i * 0.12, duration: 0.3 }}
                className="flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground/90 leading-snug">{reason}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
