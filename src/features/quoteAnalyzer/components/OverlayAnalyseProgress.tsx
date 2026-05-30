/**
 * OverlayAnalyseProgress — Full-screen animated progress while AI analyzes quotes.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

const STEPS = [
  "Lecture des documents…",
  "Extraction des prix, garanties et exclusions…",
  "Comparaison avec les standards du marché QC…",
  "Préparation de votre recommandation…",
];

interface Props {
  open: boolean;
}

export default function OverlayAnalyseProgress({ open }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 1600);
    return () => clearInterval(interval);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl px-6"
        >
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
                <Loader2 className="relative h-10 w-10 text-primary animate-spin" />
              </div>
              <h2 className="text-lg font-semibold text-foreground text-center">
                Analyse en cours
              </h2>
              <p className="text-xs text-muted-foreground text-center">
                Nos modèles lisent et comparent vos soumissions.
              </p>
            </div>

            <div className="space-y-3">
              {STEPS.map((label, i) => {
                const state = i < step ? "done" : i === step ? "active" : "pending";
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="flex-shrink-0 w-5 h-5">
                      {state === "done" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {state === "active" && (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                      {state === "pending" && (
                        <div className="w-5 h-5 rounded-full border-2 border-muted" />
                      )}
                    </div>
                    <span
                      className={
                        state === "pending"
                          ? "text-muted-foreground/60"
                          : state === "active"
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                      }
                    >
                      {label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "5%" }}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
