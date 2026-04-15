/**
 * HeaderAlexPresenceStatus — Cinematic presence header for Alex.
 * Shows avatar orb, name, dynamic status, and online indicator.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Volume2, Mic, Loader2 } from "lucide-react";

type PresenceStatus = "online" | "speaking" | "listening" | "thinking" | "analyzing" | "searching_slots" | "ended";

interface Props {
  status: PresenceStatus;
}

const STATUS_CONFIG: Record<PresenceStatus, { label: string; color: string }> = {
  online: { label: "En ligne", color: "bg-emerald-400" },
  speaking: { label: "Parle…", color: "bg-emerald-400" },
  listening: { label: "Vous écoute…", color: "bg-blue-400" },
  thinking: { label: "Un instant…", color: "bg-amber-400" },
  analyzing: { label: "Analyse en cours…", color: "bg-violet-400" },
  searching_slots: { label: "Recherche de créneaux…", color: "bg-cyan-400" },
  ended: { label: "Conversation terminée", color: "bg-muted-foreground/40" },
};

export default function HeaderAlexPresenceStatus({ status }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/15 bg-card/40 backdrop-blur-md">
      {/* Orb */}
      <div className="relative">
        <motion.div
          className="w-10 h-10 rounded-full flex items-center justify-center border border-primary/25"
          style={{
            background: "radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.3), hsl(262 80% 50% / 0.1))",
          }}
          animate={{
            scale: status === "thinking" ? [1, 0.94, 1] : status === "speaking" ? [1, 1.06, 1] : 1,
            boxShadow: status === "speaking"
              ? ["0 0 15px hsl(var(--primary) / 0.2)", "0 0 25px hsl(var(--primary) / 0.4)", "0 0 15px hsl(var(--primary) / 0.2)"]
              : status === "thinking"
              ? ["0 0 10px hsl(262 80% 50% / 0.15)", "0 0 18px hsl(262 80% 50% / 0.3)", "0 0 10px hsl(262 80% 50% / 0.15)"]
              : "0 0 12px hsl(var(--primary) / 0.1)",
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {status === "speaking" ? (
            <Volume2 className="w-4.5 h-4.5 text-primary" />
          ) : status === "listening" ? (
            <Mic className="w-4.5 h-4.5 text-primary" />
          ) : status === "thinking" || status === "analyzing" ? (
            <Loader2 className="w-4.5 h-4.5 text-primary animate-spin" />
          ) : (
            <Bot className="w-4.5 h-4.5 text-primary" />
          )}
        </motion.div>
        {/* Live dot */}
        <motion.span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${config.color}`}
          animate={status === "speaking" || status === "listening" ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground font-display tracking-tight">Alex · UNPRO</h1>
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-muted-foreground"
          >
            {config.label}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Subtle presence animation */}
      {(status === "speaking" || status === "listening") && (
        <div className="flex gap-0.5 items-end h-4">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="w-0.5 bg-primary/60 rounded-full"
              animate={{ height: ["4px", "14px", "6px", "12px", "4px"] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
