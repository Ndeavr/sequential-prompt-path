import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import {
  FileText, Building2, Fingerprint, ShieldAlert, Eye, Camera, Shield, ScanLine,
} from "lucide-react";
import { VerificationStepCard, type StepState } from "./VerificationStepCard";
import { FinalVerdictCard } from "./FinalVerdictCard";
import type { VerificationVerdict } from "./StatusBadge";

export interface TimelineStep {
  key: string;
  label: string;
  icon: React.ElementType;
  verdict?: VerificationVerdict;
  detail?: string;
}

const DEFAULT_STEPS: TimelineStep[] = [
  { key: "input", label: "Lecture des données d'entrée", icon: ScanLine },
  { key: "rbq", label: "Validation licence RBQ", icon: FileText },
  { key: "neq", label: "Validation entreprise / NEQ", icon: Building2 },
  { key: "identity", label: "Cohérence identité / coordonnées", icon: Fingerprint },
  { key: "risk", label: "Analyse signaux de prudence", icon: ShieldAlert },
  { key: "scope", label: "Portée réelle de la licence", icon: Eye },
  { key: "visual", label: "Validation UNPRO visuelle", icon: Camera },
  { key: "verdict", label: "Verdict final", icon: Shield },
];

const DEMO_RESULTS: { verdict: VerificationVerdict; detail: string }[] = [
  { verdict: "succes", detail: "Données d'entrée traitées avec succès" },
  { verdict: "succes", detail: "Licence RBQ trouvée — valide" },
  { verdict: "succes", detail: "Entreprise immatriculée au REQ" },
  { verdict: "attention", detail: "Coordonnées partiellement cohérentes" },
  { verdict: "succes", detail: "Aucun signal de prudence détecté" },
  { verdict: "attention", detail: "Portée de licence à vérifier" },
  { verdict: "succes", detail: "Validation UNPRO concluante" },
  { verdict: "succes", detail: "Verdict UNPRO : Très rassurant" },
];

interface VerificationTimelineProps {
  /** If provided, uses these steps + results. Otherwise uses defaults. */
  steps?: TimelineStep[];
  /** Autoplay demo mode — loops continuously */
  autoplay?: boolean;
  /** Trigger to start a single run */
  running?: boolean;
  /** Delay between steps in ms */
  stepDelay?: number;
  /** Called when the full sequence completes */
  onComplete?: () => void;
  /** Final verdict data for the verdict card */
  finalVerdict?: {
    verdict: VerificationVerdict;
    headline: string;
    summary: string;
    nextSteps?: string[];
  };
}

export function VerificationTimeline({
  steps: customSteps,
  autoplay = false,
  running = false,
  stepDelay = 1200,
  onComplete,
  finalVerdict,
}: VerificationTimelineProps) {
  const steps = customSteps || DEFAULT_STEPS;
  const [states, setStates] = useState<StepState[]>(steps.map(() => "idle"));
  const [results, setResults] = useState<{ verdict: VerificationVerdict; detail: string }[]>(
    customSteps?.map((s) => ({ verdict: s.verdict || "succes", detail: s.detail || "" })) || DEMO_RESULTS
  );
  const [showVerdict, setShowVerdict] = useState(false);
  const runningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Update results when custom steps change
  useEffect(() => {
    if (customSteps) {
      setResults(customSteps.map((s) => ({ verdict: s.verdict || "succes", detail: s.detail || "" })));
    }
  }, [customSteps]);

  const runSequence = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setShowVerdict(false);

    // Reset
    setStates(steps.map(() => "idle"));
    await new Promise((r) => setTimeout(r, 300));

    for (let i = 0; i < steps.length; i++) {
      if (!runningRef.current && !autoplay) break;

      // Set loading
      setStates((prev) => prev.map((s, j) => (j === i ? "loading" : s)));

      // Wait
      const wait = stepDelay + Math.random() * 600;
      await new Promise((r) => {
        timeoutRef.current = setTimeout(r, wait);
      });

      // Set done
      setStates((prev) => prev.map((s, j) => (j === i ? "done" : s)));
    }

    // Show final verdict
    await new Promise((r) => setTimeout(r, 400));
    setShowVerdict(true);
    runningRef.current = false;
    onComplete?.();

    // Autoplay loop
    if (autoplay) {
      await new Promise((r) => {
        timeoutRef.current = setTimeout(r, 4000);
      });
      setShowVerdict(false);
      setStates(steps.map(() => "idle"));
      await new Promise((r) => setTimeout(r, 800));
      runSequence();
    }
  }, [steps, autoplay, stepDelay, onComplete]);

  // Start on trigger or autoplay
  useEffect(() => {
    if (running || autoplay) {
      runSequence();
    }
    return () => {
      runningRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [running, autoplay]);

  const verdictData = finalVerdict || {
    verdict: "succes" as VerificationVerdict,
    headline: "Entrepreneur vérifié avec confiance",
    summary: "Les validations croisées confirment la cohérence de l'identité commerciale, selon les informations publiques disponibles.",
    nextSteps: [
      "Demander une soumission détaillée",
      "Vérifier la preuve d'assurance",
      "Confirmer la portée des travaux",
    ],
  };

  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => (
        <VerificationStepCard
          key={step.key}
          icon={step.icon}
          label={step.label}
          state={states[i]}
          verdict={states[i] === "done" ? results[i]?.verdict : undefined}
          detail={states[i] === "done" ? results[i]?.detail : undefined}
          index={i}
        />
      ))}

      <AnimatePresence>
        {showVerdict && (
          <FinalVerdictCard
            verdict={verdictData.verdict}
            headline={verdictData.headline}
            summary={verdictData.summary}
            nextSteps={verdictData.nextSteps}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
