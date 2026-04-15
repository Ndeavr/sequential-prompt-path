/**
 * CardAppointmentConfirmed — Success confirmation card with premium glow.
 */
import { motion } from "framer-motion";
import { CheckCircle2, Calendar, Sparkles } from "lucide-react";

interface Props {
  dateLabel: string;
  contractorName?: string;
  delay?: number;
}

export default function CardAppointmentConfirmed({ dateLabel, contractorName, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className="w-full max-w-[88%] ml-10 rounded-xl overflow-hidden"
    >
      {/* Success glow border */}
      <div
        className="p-[1px] rounded-xl"
        style={{
          background: "linear-gradient(135deg, hsl(142 70% 45% / 0.5), hsl(142 70% 45% / 0.2), hsl(var(--primary) / 0.15))",
        }}
      >
        <div
          className="rounded-xl px-5 py-5 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(142 70% 45% / 0.08), hsl(var(--card) / 0.95))",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Glow effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center top, hsl(142 70% 45% / 0.08), transparent 70%)",
            }}
          />

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="relative z-10"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.35 }}
            className="relative z-10"
          >
            <h3 className="text-base font-bold text-foreground mb-1">Rendez-vous confirmé</h3>
            <div className="flex items-center justify-center gap-1.5 text-sm text-emerald-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateLabel}</span>
            </div>
            {contractorName && (
              <p className="text-xs text-muted-foreground mt-1.5">avec {contractorName}</p>
            )}
          </motion.div>

          {/* Sparkle accents */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.5 }}
            className="absolute top-3 right-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400/40" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
