import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { StatusBadge, type VerificationVerdict } from "./StatusBadge";
import { AnimatedProgressLine } from "./AnimatedProgressLine";

export type StepState = "idle" | "loading" | "done";

const LOADING_COPY = [
  "En cours de validation…",
  "Analyse des informations visibles…",
  "Comparaison avec les données disponibles…",
];

interface VerificationStepCardProps {
  icon: React.ElementType;
  label: string;
  state: StepState;
  verdict?: VerificationVerdict;
  detail?: string;
  index: number;
}

export function VerificationStepCard({
  icon: Icon,
  label,
  state,
  verdict,
  detail,
  index,
}: VerificationStepCardProps) {
  const loadingText = LOADING_COPY[index % LOADING_COPY.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      <motion.div
        animate={
          state === "loading"
            ? { scale: [1, 1.005, 1], opacity: [1, 0.95, 1] }
            : {}
        }
        transition={
          state === "loading"
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : {}
        }
        className={`relative rounded-2xl border p-4 transition-all duration-500 overflow-hidden ${
          state === "done" && verdict
            ? `border-${verdict === "succes" ? "success" : verdict === "attention" ? "warning" : "destructive"}/20 bg-card`
            : state === "loading"
            ? "border-primary/30 bg-primary/[0.02]"
            : "border-border/40 bg-card/60"
        }`}
      >
        {/* Active glow */}
        {state === "loading" && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0, 0.06, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: "radial-gradient(ellipse at 50% 50%, hsl(var(--primary)), transparent 70%)",
            }}
          />
        )}

        <div className="relative z-10 flex items-start gap-3.5">
          {/* Icon */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
              state === "done"
                ? verdict === "succes"
                  ? "bg-success/12"
                  : verdict === "attention"
                  ? "bg-warning/12"
                  : "bg-destructive/12"
                : state === "loading"
                ? "bg-primary/10"
                : "bg-muted/50"
            }`}
          >
            <Icon
              className={`w-[18px] h-[18px] transition-colors duration-500 ${
                state === "done"
                  ? verdict === "succes"
                    ? "text-success"
                    : verdict === "attention"
                    ? "text-warning"
                    : "text-destructive"
                  : state === "loading"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <AnimatePresence mode="wait">
                {state === "loading" && (
                  <motion.span
                    key="loader"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-shrink-0"
                  >
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </motion.span>
                )}
                {state === "done" && verdict && (
                  <StatusBadge key="badge" verdict={verdict} />
                )}
              </AnimatePresence>
            </div>

            {/* Loading text */}
            <AnimatePresence mode="wait">
              {state === "loading" && (
                <motion.p
                  key="loading-text"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-muted-foreground mt-1"
                >
                  {loadingText}
                </motion.p>
              )}
              {state === "done" && detail && (
                <motion.p
                  key="detail-text"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`text-xs mt-1 ${
                    verdict === "succes"
                      ? "text-success/80"
                      : verdict === "attention"
                      ? "text-warning/80"
                      : "text-destructive/80"
                  }`}
                >
                  {detail}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress line */}
        <AnimatedProgressLine isActive={state === "loading"} />
      </motion.div>
    </motion.div>
  );
}
