/**
 * Screen 3 — Auto-Import Loading Experience
 * Animated progress with polling + dead-end fallback.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { IMPORT_STEPS } from "@/types/activationFunnel";
import PanelAlexObservesImport from "@/components/import-terminal/PanelAlexObservesImport";
import UnproLogo from "@/components/brand/UnproLogo";
import EmptyStateFallback from "@/components/ui/EmptyStateFallback";
import { Button } from "@/components/ui/button";

type StepStatus = "pending" | "running" | "completed" | "failed";

const ALEX_MESSAGES = [
  "Je commence l'analyse de votre présence en ligne…",
  "Recherche de votre profil Google Business…",
  "Extraction de vos avis clients…",
  "Vérification de votre licence RBQ…",
  "Analyse de votre site web…",
  "Identification de vos zones de service…",
  "Calcul de votre score AIPP préliminaire…",
  "Presque terminé! Compilation des résultats…",
];

export default function ScreenImport() {
  const navigate = useNavigate();
  const { state, pollImportStatus, updateFunnel } = useActivationFunnel();
  const [steps, setSteps] = useState<Array<{ key: string; label: string; status: StepStatus }>>(
    IMPORT_STEPS.map(s => ({ ...s, status: "pending" as StepStatus }))
  );
  const [alexMessages, setAlexMessages] = useState<string[]>([ALEX_MESSAGES[0]]);
  const [importFailed, setImportFailed] = useState(false);
  const currentStepRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const advanceStep = useCallback(() => {
    const idx = currentStepRef.current;
    if (idx >= IMPORT_STEPS.length) {
      clearInterval(intervalRef.current);
      setTimeout(() => navigate("/entrepreneur/activer/score"), 800);
      return;
    }

    setSteps(prev => prev.map((s, i) => {
      if (i === idx) return { ...s, status: "running" };
      if (i === idx - 1) return { ...s, status: "completed" };
      return s;
    }));

    if (idx < ALEX_MESSAGES.length) {
      setAlexMessages(prev => [...prev, ALEX_MESSAGES[idx]]);
    }

    currentStepRef.current = idx + 1;

    setTimeout(() => {
      setSteps(prev => prev.map((s, i) => {
        if (i === idx) return { ...s, status: "completed" };
        return s;
      }));
    }, 1500);
  }, [navigate]);

  useEffect(() => {
    const triggerEnrich = async () => {
      if (state.id) {
        try {
          const { supabase: sb } = await import("@/integrations/supabase/client");
          await sb.functions.invoke("contractor-activation-enrich", {
            body: {
              funnel_id: state.id,
              business_name: state.business_name,
              phone: state.phone,
              website: state.website,
            },
          });
        } catch (e) {
          console.error("Enrich call failed:", e);
        }
      }
    };
    triggerEnrich();

    advanceStep();
    intervalRef.current = setInterval(advanceStep, 2000);

    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    let failTimer: ReturnType<typeof setTimeout>;
    const poll = setInterval(async () => {
      const status = await pollImportStatus();
      if (status === "completed") clearInterval(poll);
      if (status === "failed") {
        clearInterval(poll);
        setImportFailed(true);
      }
    }, 3000);

    // If no completion after 45s, show fallback
    failTimer = setTimeout(() => {
      setImportFailed(true);
    }, 45000);

    return () => {
      clearInterval(poll);
      clearTimeout(failTimer);
    };
  }, [pollImportStatus]);

  const progress = Math.round(
    (steps.filter(s => s.status === "completed").length / steps.length) * 100
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <UnproLogo size={80} variant="primary" animated={false} showWordmark={false} />
        <div>
          <h2 className="text-lg font-bold text-foreground">Analyse en cours</h2>
          <p className="text-xs text-muted-foreground">{state.business_name || "Votre entreprise"}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">{progress}%</p>
      </div>

      {/* Steps */}
      <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        <AnimatePresence>
          {steps.map((step, i) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                step.status === "running" && "border-primary/40 bg-primary/5",
                step.status === "completed" && "border-border/30 bg-card/30",
                step.status === "pending" && "border-border/20 opacity-50",
                step.status === "failed" && "border-destructive/30 bg-destructive/5",
              )}
            >
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                {step.status === "pending" && <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                {step.status === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {step.status === "completed" && <Check className="w-4 h-4 text-emerald-500" />}
                {step.status === "failed" && <X className="w-4 h-4 text-destructive" />}
              </div>
              <span className={cn(
                "text-sm",
                step.status === "running" && "font-medium text-foreground",
                step.status === "completed" && "text-muted-foreground",
                step.status === "pending" && "text-muted-foreground/60",
              )}>
                {step.label}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Dead-end fallback */}
        {importFailed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <EmptyStateFallback
              title="L'import prend plus de temps que prévu"
              description="Vous pouvez continuer manuellement ou réessayer."
              onRetry={() => {
                setImportFailed(false);
                currentStepRef.current = 0;
                advanceStep();
              }}
              onManualAdd={() => navigate("/entrepreneur/activer/profil")}
              retryLabel="Réessayer l'import"
              manualLabel="Continuer manuellement"
            />
          </motion.div>
        )}
      </div>

      {/* Alex observation */}
      <div className="px-4 pb-6">
        <PanelAlexObservesImport messages={alexMessages} />
      </div>
    </div>
  );
}
