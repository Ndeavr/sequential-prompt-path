/**
 * UNPRO — Premium Contractor Onboarding Flow
 * 10-screen wizard: Import → Retrieval → Audit → Complete → AIPP → Objective → Plan → Pay → Activate → Dashboard
 */
import { useState, useCallback } from "react";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import StepImportSources from "@/components/onboarding/StepImportSources";
import StepRetrieval from "@/components/onboarding/StepRetrieval";
import StepAuditResults from "@/components/onboarding/StepAuditResults";
import StepCompleteMissing from "@/components/onboarding/StepCompleteMissing";
import StepAIPPReveal from "@/components/onboarding/StepAIPPReveal";
import StepObjective from "@/components/onboarding/StepObjective";
import StepPlanRecommendation from "@/components/onboarding/StepPlanRecommendation";
import StepPayment from "@/components/onboarding/StepPayment";
import StepActivation from "@/components/onboarding/StepActivation";
import StepDashboardLanding from "@/components/onboarding/StepDashboardLanding";
import {
  simulateRetrieval,
  generateAuditSections,
  calculateOnboardingAIPP,
  createEmptyBusinessData,
  type RetrievalModule,
  type ImportedBusinessData,
  type AuditSection,
  type OnboardingAIPPScore,
} from "@/services/businessImportService";

const TOTAL_STEPS = 10;

/** Official UNPRO plan catalog — single source of truth */
const PLAN_CATALOG: Record<string, { name: string; monthlyPrice: number; yearlyPrice: number }> = {
  recrue:    { name: "Recrue",    monthlyPrice: 49,  yearlyPrice: 499  },
  pro:       { name: "Pro",       monthlyPrice: 99,  yearlyPrice: 999  },
  premium:   { name: "Premium",   monthlyPrice: 149, yearlyPrice: 1499 },
  elite:     { name: "Élite",     monthlyPrice: 249, yearlyPrice: 2499 },
  signature: { name: "Signature", monthlyPrice: 499, yearlyPrice: 4999 },
};

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [modules, setModules] = useState<RetrievalModule[]>([]);
  const [businessData, setBusinessData] = useState<ImportedBusinessData>(createEmptyBusinessData());
  const [auditSections, setAuditSections] = useState<AuditSection[]>([]);
  const [aippScore, setAippScore] = useState<OnboardingAIPPScore | null>(null);
  const [objective, setObjective] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string; price: number; interval: "month" | "year" }>({ id: "recrue", name: "Recrue", price: 49, interval: "month" });

  const handleImport = useCallback((form: { businessName: string }) => {
    setBusinessName(form.businessName);
    setStep(1);
    simulateRetrieval(
      form.businessName,
      (mods) => setModules(mods),
      (data) => {
        setBusinessData(data);
        setAuditSections(generateAuditSections(data));
        setAippScore(calculateOnboardingAIPP(data));
        setTimeout(() => setStep(2), 800);
      }
    );
  }, []);

  const overallProgress = modules.length > 0
    ? Math.round(modules.reduce((s, m) => s + m.progress, 0) / modules.length)
    : 0;

  return (
    <OnboardingShell currentStep={step} totalSteps={TOTAL_STEPS} showProgress={step < 8}>
      {step === 0 && (
        <StepImportSources
          onImport={handleImport}
          onManual={() => { setBusinessName("My Business"); setStep(3); }}
        />
      )}
      {step === 1 && (
        <StepRetrieval modules={modules} overallProgress={overallProgress} />
      )}
      {step === 2 && (
        <StepAuditResults sections={auditSections} onContinue={() => setStep(3)} />
      )}
      {step === 3 && (
        <StepCompleteMissing data={businessData} onContinue={(updates) => {
          setAippScore(calculateOnboardingAIPP(businessData));
          setStep(4);
        }} />
      )}
      {step === 4 && aippScore && (
        <StepAIPPReveal score={aippScore} onContinue={() => setStep(5)} />
      )}
      {step === 5 && (
        <StepObjective onSelect={(obj) => { setObjective(obj); setStep(6); }} />
      )}
      {step === 6 && aippScore && (
        <StepPlanRecommendation
          aippScore={aippScore.total}
          objective={objective}
          onSelectPlan={(planId, interval) => {
            const p = PLAN_CATALOG[planId] || PLAN_CATALOG.recrue;
            setSelectedPlan({ id: planId, name: p.name, price: interval === "month" ? p.monthlyPrice : p.yearlyPrice, interval });
            setStep(7);
          }}
        />
      )}
      {step === 7 && aippScore && (
        <StepPayment
          planName={selectedPlan.name}
          price={selectedPlan.price}
          interval={selectedPlan.interval}
          aippScore={aippScore.total}
          objective={objective}
          onPay={() => setStep(8)}
        />
      )}
      {step === 8 && (
        <StepActivation onComplete={() => setStep(9)} />
      )}
      {step === 9 && aippScore && (
        <StepDashboardLanding businessName={businessName || "My Business"} aippScore={aippScore.total} />
      )}
    </OnboardingShell>
  );
}
