/**
 * AlexOrbState — Animated orb reflecting Alex's current processing state.
 * Used inside the conversation shell.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Sparkles, Search, Calendar, AlertCircle } from "lucide-react";
import type { AlexStep } from "@/hooks/useAlexSession";

interface AlexOrbStateProps {
  step: AlexStep;
  size?: number;
  className?: string;
}

const stepConfig: Record<AlexStep, { icon: typeof Mic; label: string; pulse: boolean; color: string }> = {
  idle: { icon: Mic, label: "Prêt", pulse: false, color: "var(--muted-foreground)" },
  listening: { icon: Mic, label: "Je vous écoute…", pulse: true, color: "var(--primary)" },
  thinking: { icon: Sparkles, label: "Je regarde…", pulse: true, color: "var(--primary)" },
  predicting: { icon: Search, label: "J'analyse…", pulse: true, color: "var(--secondary)" },
  matching: { icon: Search, label: "Je cherche le bon fit…", pulse: true, color: "var(--secondary)" },
  preparing_booking: { icon: Calendar, label: "Je prépare ça…", pulse: true, color: "var(--accent)" },
  speaking: { icon: Sparkles, label: "Alex parle…", pulse: false, color: "var(--primary)" },
  opening_calendar: { icon: Calendar, label: "J'ouvre le calendrier…", pulse: true, color: "var(--accent)" },
  waiting_input: { icon: Mic, label: "Allez-y…", pulse: false, color: "var(--primary)" },
  objection_handling: { icon: Sparkles, label: "Je comprends…", pulse: false, color: "var(--primary)" },
  auth_resume: { icon: Sparkles, label: "On reprend…", pulse: true, color: "var(--success)" },
  no_result_recovery: { icon: Search, label: "Je cherche des alternatives…", pulse: true, color: "var(--warning)" },
  success: { icon: Sparkles, label: "C'est prêt.", pulse: false, color: "var(--success)" },
  error: { icon: AlertCircle, label: "Hmm, réessayez.", pulse: false, color: "var(--destructive)" },
};

export default function AlexOrbState({ step, size = 48, className = "" }: AlexOrbStateProps) {
  const config = stepConfig[step] || stepConfig.idle;
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size + 16, height: size + 16 }}>
        {/* Pulse ring */}
        {config.pulse && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: size + 16,
              height: size + 16,
              background: `radial-gradient(circle, hsl(${config.color} / 0.15) 0%, transparent 70%)`,
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Core */}
        <motion.div
          className="rounded-full flex items-center justify-center"
          style={{
            width: size,
            height: size,
            background: `linear-gradient(135deg, hsl(${config.color}), hsl(${config.color} / 0.7))`,
            boxShadow: `0 4px 20px -4px hsl(${config.color} / 0.3)`,
          }}
          animate={config.pulse ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className="text-primary-foreground" style={{ width: size * 0.45, height: size * 0.45 }} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.p
        key={step}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 0.7, y: 0 }}
        className="text-xs text-muted-foreground font-medium"
      >
        {config.label}
      </motion.p>
    </div>
  );
}
