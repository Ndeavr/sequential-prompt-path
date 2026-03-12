import { motion } from "framer-motion";
import { Check, Loader2, AlertTriangle, X, Clock } from "lucide-react";
import type { RetrievalModule } from "@/services/businessImportService";

interface Props {
  modules: RetrievalModule[];
  overallProgress: number;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  waiting: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/40" },
  scanning: { icon: Loader2, color: "text-accent", bg: "bg-accent/10" },
  found: { icon: Check, color: "text-success", bg: "bg-success/10" },
  completed: { icon: Check, color: "text-success", bg: "bg-success/10" },
  partial: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  missing: { icon: X, color: "text-destructive", bg: "bg-destructive/10" },
};

export default function StepRetrieval({ modules, overallProgress }: Props) {
  return (
    <div className="dark min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Animated orb */}
        <motion.div className="flex flex-col items-center gap-4">
          <div className="relative w-28 h-28">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 blur-xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-2 rounded-full bg-card border border-border/50 flex items-center justify-center">
              <span className="text-2xl font-bold font-display text-foreground">{overallProgress}%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Analyzing your business presence…</p>
        </motion.div>

        {/* Retrieval modules */}
        <div className="space-y-2.5">
          {modules.map((mod, i) => {
            const cfg = statusConfig[mod.status] || statusConfig.waiting;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color} ${mod.status === "scanning" ? "animate-spin" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{mod.label}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                    {mod.status}
                  </span>
                </div>
                {/* Progress bar */}
                {mod.status !== "waiting" && (
                  <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${mod.progress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
                {/* Messages */}
                {mod.messages.length > 0 && (
                  <div className="space-y-0.5 pl-10">
                    {mod.messages.map((msg, j) => (
                      <motion.p
                        key={j}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-muted-foreground"
                      >
                        {msg}
                      </motion.p>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
