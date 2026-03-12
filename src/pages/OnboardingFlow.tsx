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

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [modules, setModules] = useState<RetrievalModule[]>([]);
  const [businessData, setBusinessData] = useState<ImportedBusinessData>(createEmptyBusinessData());
  const [auditSections, setAuditSections] = useState<AuditSection[]>([]);
  const [aippScore, setAippScore] = useState<OnboardingAIPPScore | null>(null);
  const [objective, setObjective] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string; price: number; interval: "month" | "year" }>({ id: "growth", name: "Growth", price: 99, interval: "month" });

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

  const planPrices: Record<string, { month: number; year: number; name: string }> = {
    starter: { month: 49, year: 499, name: "Starter" },
    growth: { month: 99, year: 999, name: "Growth" },
    authority: { month: 199, year: 1999, name: "Authority" },
    signature: { month: 499, year: 4999, name: "Signature" },
  };

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
          // Recalculate AIPP with updates
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
            const p = planPrices[planId] || planPrices.growth;
            setSelectedPlan({ id: planId, name: p.name, price: interval === "month" ? p.month : p.year, interval });
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
