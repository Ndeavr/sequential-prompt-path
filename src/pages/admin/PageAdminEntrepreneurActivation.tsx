/**
 * UNPRO — Admin Entrepreneur Activation Wizard
 * Route: /admin/activation/entrepreneur
 * 7-step wizard to fully activate an entrepreneur from scratch
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Building2, Download, User, BarChart3, CreditCard, Rocket, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import StepEntrepriseSearch from "@/components/admin/activation/StepEntrepriseSearch";
import StepDataImport from "@/components/admin/activation/StepDataImport";
import StepProfileBuilder from "@/components/admin/activation/StepProfileBuilder";
import StepScoring from "@/components/admin/activation/StepScoring";
import StepPlanAssignment from "@/components/admin/activation/StepPlanAssignment";
import StepActivation from "@/components/admin/activation/StepActivation";
import StepSummary from "@/components/admin/activation/StepSummary";

const STEPS = [
  { key: "entreprise", label: "Entreprise", icon: Building2 },
  { key: "import", label: "Importation", icon: Download },
  { key: "profil", label: "Profil", icon: User },
  { key: "score", label: "Score", icon: BarChart3 },
  { key: "plan", label: "Plan", icon: CreditCard },
  { key: "activation", label: "Activation", icon: Rocket },
  { key: "resume", label: "Résumé", icon: ClipboardCheck },
] as const;

export type ActivationWizardState = {
  contractorId: string | null;
  contractorData: any;
  importJobId: string | null;
  profileComplete: boolean;
  scoreComputed: boolean;
  planAssigned: boolean;
  planCode: string | null;
  bypassApplied: boolean;
  activated: boolean;
  published: boolean;
  readinessReady: boolean;
  events: Array<{ type: string; timestamp: string; detail?: string }>;
};

const initialState: ActivationWizardState = {
  contractorId: null,
  contractorData: null,
  importJobId: null,
  profileComplete: false,
  scoreComputed: false,
  planAssigned: false,
  planCode: null,
  bypassApplied: false,
  activated: false,
  published: false,
  readinessReady: false,
  events: [],
};

export default function PageAdminEntrepreneurActivation() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<ActivationWizardState>(initialState);

  const updateState = useCallback((partial: Partial<ActivationWizardState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const addEvent = useCallback((type: string, detail?: string) => {
    setState(prev => ({
      ...prev,
      events: [...prev.events, { type, timestamp: new Date().toISOString(), detail }],
    }));
  }, []);

  const canAdvance = (step: number): boolean => {
    switch (step) {
      case 0: return !!state.contractorId;
      case 1: return true; // import is optional
      case 2: return state.profileComplete;
      case 3: return state.scoreComputed;
      case 4: return state.planAssigned;
      case 5: return state.activated;
      default: return true;
    }
  };

  const getStepStatus = (idx: number): "done" | "current" | "upcoming" => {
    if (idx < currentStep) return "done";
    if (idx === currentStep) return "current";
    return "upcoming";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Activation Entrepreneur</h1>
              <p className="text-sm text-muted-foreground">Flux complet d'activation admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Progress Bar - Sticky */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-none">
            {STEPS.map((step, idx) => {
              const status = getStepStatus(idx);
              const Icon = step.icon;
              return (
                <button
                  key={step.key}
                  onClick={() => idx <= currentStep && setCurrentStep(idx)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-w-fit ${
                    status === "current"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : status === "done"
                      ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                  disabled={idx > currentStep}
                >
                  {status === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 0 && (
              <StepEntrepriseSearch state={state} updateState={updateState} addEvent={addEvent} />
            )}
            {currentStep === 1 && (
              <StepDataImport state={state} updateState={updateState} addEvent={addEvent} />
            )}
            {currentStep === 2 && (
              <StepProfileBuilder state={state} updateState={updateState} addEvent={addEvent} />
            )}
            {currentStep === 3 && (
              <StepScoring state={state} updateState={updateState} addEvent={addEvent} />
            )}
            {currentStep === 4 && (
              <StepPlanAssignment state={state} updateState={updateState} addEvent={addEvent} />
            )}
            {currentStep === 5 && (
              <StepActivation state={state} updateState={updateState} addEvent={addEvent} />
            )}
            {currentStep === 6 && (
              <StepSummary state={state} updateState={updateState} addEvent={addEvent} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => {
                if (canAdvance(currentStep)) {
                  setCurrentStep(currentStep + 1);
                } else {
                  toast.warning("Complétez les champs requis avant de continuer");
                }
              }}
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => {
                toast.success("Activation complétée !");
                navigate("/admin/contractors");
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Terminer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
