import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertTriangle, X, Clock, Wifi, Search, Shield, BarChart3, Sparkles } from "lucide-react";
import type { RetrievalModule } from "@/services/businessImportService";

interface Props {
  modules: RetrievalModule[];
  overallProgress: number;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  waiting: { icon: Clock, color: "text-muted-foreground/50", bg: "bg-muted/20", label: "Waiting" },
  scanning: { icon: Loader2, color: "text-accent", bg: "bg-accent/10", label: "Scanning" },
  found: { icon: Check, color: "text-success", bg: "bg-success/10", label: "Found" },
  completed: { icon: Check, color: "text-success", bg: "bg-success/10", label: "Complete" },
  partial: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Partial" },
  missing: { icon: X, color: "text-destructive/70", bg: "bg-destructive/10", label: "Missing" },
};

const moduleIcons: Record<string, any> = {
  identity: Search, google: Wifi, facebook: Wifi, website: Wifi,
  matching: Shield, analysis: BarChart3, aipp: Sparkles, plan: Sparkles,
};

export default function StepRetrieval({ modules, overallProgress }: Props) {
  const [currentMsg, setCurrentMsg] = useState("");
  const activeModule = modules.find(m => m.status === "scanning");
  const completedCount = modules.filter(m => m.status === "completed" || m.status === "found").length;

  useEffect(() => {
    if (activeModule?.messages.length) {
      setCurrentMsg(activeModule.messages[activeModule.messages.length - 1]);
    }
  }, [activeModule]);

  return (
    <div className="dark min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg space-y-8">
        {/* Central intelligence orb */}
        <motion.div className="flex flex-col items-center gap-5 pt-4">
          <div className="relative w-36 h-36">
            {/* Outer glow rings */}
            <motion.div
              className="absolute inset-[-24px] rounded-full border border-primary/[0.08]"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-[-12px] rounded-full border border-accent/[0.12]"
              animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.7 }}
            />
            {/* Core glow */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 via-accent/15 to-secondary/25 blur-2xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            {/* Inner orb */}
            <div className="absolute inset-3 rounded-full bg-card border border-border/50 flex flex-col items-center justify-center shadow-[var(--shadow-xl)]">
              <motion.span
                key={overallProgress}
                className="text-3xl font-bold font-display text-foreground"
              >
                {overallProgress}%
              </motion.span>
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium mt-0.5">Scanning</span>
            </div>
            {/* Orbiting dot */}
            <motion.div
              className="absolute w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ top: "50%", left: "50%", transformOrigin: "0 -60px" }}
            />
          </div>

          {/* Dynamic status message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={currentMsg}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-sm text-muted-foreground text-center font-medium"
            >
              {currentMsg || "Preparing analysis…"}
            </motion.p>
          </AnimatePresence>

          {/* Summary counters */}
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5 text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {completedCount} found
            </div>
            <div className="flex items-center gap-1.5 text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {modules.filter(m => m.status === "scanning").length} scanning
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              {modules.filter(m => m.status === "waiting").length} pending
            </div>
          </div>
        </motion.div>

        {/* Retrieval modules */}
        <div className="space-y-2">
          {modules.map((mod, i) => {
            const cfg = statusConfig[mod.status] || statusConfig.waiting;
            const StatusIcon = cfg.icon;
            const ModuleIcon = moduleIcons[mod.id] || Search;
            const isActive = mod.status === "scanning";
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-xl border p-3.5 transition-all duration-300 ${
                  isActive
                    ? "border-accent/30 bg-accent/[0.04] shadow-[0_0_20px_-4px_hsl(var(--accent)/0.1)]"
                    : mod.status === "completed" || mod.status === "found"
                    ? "border-success/20 bg-success/[0.02]"
                    : "border-border/30 bg-card/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-4 h-4 ${cfg.color} ${isActive ? "animate-spin" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isActive ? "text-foreground" : mod.status === "waiting" ? "text-muted-foreground/60" : "text-foreground"}`}>
                      {mod.label}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Progress bar */}
                {mod.status !== "waiting" && (
                  <div className="mt-2.5 h-[3px] rounded-full bg-muted/20 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        mod.status === "completed" || mod.status === "found"
                          ? "bg-success"
                          : mod.status === "partial"
                          ? "bg-warning"
                          : "bg-gradient-to-r from-accent to-primary"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${mod.progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                )}

                {/* Live messages with stagger */}
                {mod.messages.length > 0 && (
                  <div className="mt-2 space-y-0.5 pl-11">
                    {mod.messages.map((msg, j) => (
                      <motion.p
                        key={j}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: j * 0.05 }}
                        className="text-[11px] text-muted-foreground/70"
                      >
                        <span className="text-muted-foreground/30 mr-1.5">›</span>
                        {msg}
                      </motion.p>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom trust note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-[10px] text-muted-foreground/40"
        >
          🔒 All data is encrypted and only used to build your UNPRO profile
        </motion.div>
      </div>
    </div>
  );
}
