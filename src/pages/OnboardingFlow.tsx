/**
 * UNPRO — Premium Contractor Onboarding Flow
 * 10-screen wizard: Import → Retrieval → Audit → Complete → AIPP → Objective → Plan → Pay → Activate → Dashboard
 * Now connected to real APIs (Google Places, Firecrawl) and persisted via Supabase.
 */
import { useState, useCallback, useEffect, useRef } from "react";
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
  generateAuditSections,
  calculateOnboardingAIPP,
  createEmptyBusinessData,
  type RetrievalModule,
  type ImportedBusinessData,
  type AuditSection,
  type OnboardingAIPPScore,
} from "@/services/businessImportService";
import { useOnboardingSession } from "@/hooks/useOnboardingSession";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const { user, isAuthenticated } = useAuth();
  const { session: savedSession, loading: sessionLoading, saveSession, markComplete } = useOnboardingSession();

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [modules, setModules] = useState<RetrievalModule[]>([]);
  const [businessData, setBusinessData] = useState<ImportedBusinessData>(createEmptyBusinessData());
  const [auditSections, setAuditSections] = useState<AuditSection[]>([]);
  const [aippScore, setAippScore] = useState<OnboardingAIPPScore | null>(null);
  const [objective, setObjective] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string; price: number; interval: "month" | "year" }>({ id: "recrue", name: "Recrue", price: 49, interval: "month" });
  const [isImporting, setIsImporting] = useState(false);
  const initializedRef = useRef(false);

  // Resume from saved session
  useEffect(() => {
    if (sessionLoading || initializedRef.current) return;
    initializedRef.current = true;
    if (savedSession.current_step > 0) {
      setStep(savedSession.current_step);
      setBusinessName(savedSession.business_name);
      if (Object.keys(savedSession.business_data).length > 0) {
        setBusinessData(savedSession.business_data as unknown as ImportedBusinessData);
        setAuditSections(generateAuditSections(savedSession.business_data as unknown as ImportedBusinessData));
      }
      if (savedSession.aipp_score) {
        setAippScore(savedSession.aipp_score as OnboardingAIPPScore);
      }
      if (savedSession.objective) setObjective(savedSession.objective);
      if (savedSession.selected_plan) {
        setSelectedPlan(savedSession.selected_plan as typeof selectedPlan);
      }
    }
  }, [sessionLoading, savedSession]);

  const goToStep = useCallback((nextStep: number, extraData: Record<string, any> = {}) => {
    setStep(nextStep);
    saveSession({ current_step: nextStep, ...extraData });
  }, [saveSession]);

  // Real import via edge function
  const handleImport = useCallback(async (form: { businessName: string; website?: string; googleUrl?: string; facebookUrl?: string; phone?: string; city?: string }) => {
    setBusinessName(form.businessName);
    setIsImporting(true);

    // Show progressive retrieval UI with "scanning" states
    const initialModules: RetrievalModule[] = [
      { id: "identity", label: "Identification de l'entreprise", status: "scanning", progress: 30, messages: ["Recherche de l'entreprise…"] },
      { id: "google", label: "Profil Google", status: "waiting", progress: 0, messages: [] },
      { id: "facebook", label: "Profil Facebook", status: "waiting", progress: 0, messages: [] },
      { id: "website", label: "Analyse du site web", status: "waiting", progress: 0, messages: [] },
      { id: "matching", label: "Correspondance des signaux", status: "waiting", progress: 0, messages: [] },
      { id: "analysis", label: "Analyse de confiance", status: "waiting", progress: 0, messages: [] },
      { id: "aipp", label: "Calcul du score AIPP", status: "waiting", progress: 0, messages: [] },
      { id: "plan", label: "Plan de croissance", status: "waiting", progress: 0, messages: [] },
    ];
    setModules(initialModules);
    goToStep(1, { business_name: form.businessName, import_form: form });

    // Animate modules progressively while waiting for API
    const updateModule = (idx: number, patch: Partial<RetrievalModule>) => {
      setModules(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
    };

    // Progressive scanning animation
    const delays = [
      () => updateModule(0, { status: "completed", progress: 100, messages: [`« ${form.businessName} » identifié`] }),
      () => updateModule(1, { status: "scanning", progress: 40, messages: ["Recherche du profil Google…"] }),
      () => updateModule(2, { status: "scanning", progress: 30, messages: ["Recherche de la page Facebook…"] }),
      () => updateModule(3, { status: "scanning", progress: 40, messages: ["Analyse du site web…"] }),
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    delays.forEach((fn, i) => timers.push(setTimeout(fn, 800 + i * 1200)));

    try {
      const { data, error } = await supabase.functions.invoke("onboarding-import", {
        body: { importForm: form },
      });

      timers.forEach(clearTimeout);

      if (error || !data) {
        toast.error("Erreur lors de l'importation. Réessayez ou remplissez manuellement.");
        console.error("Import error:", error);
        setIsImporting(false);
        return;
      }

      // Set final modules from API response
      const apiModules = data.modules as RetrievalModule[];
      setModules(apiModules);

      // Set business data
      const apiData = data.businessData as ImportedBusinessData;
      setBusinessData(apiData);
      const sections = generateAuditSections(apiData);
      setAuditSections(sections);
      const score = calculateOnboardingAIPP(apiData);
      setAippScore(score);

      saveSession({
        business_data: apiData as any,
        audit_sections: sections as any,
        aipp_score: score as any,
      });

      setTimeout(() => {
        setIsImporting(false);
        goToStep(2);
      }, 1500);
    } catch (err) {
      timers.forEach(clearTimeout);
      console.error("Import failed:", err);
      toast.error("Erreur de connexion. Réessayez.");
      setIsImporting(false);
    }
  }, [goToStep, saveSession]);

  const handleStripeCheckout = useCallback(async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour procéder au paiement.");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          planId: selectedPlan.id,
          billingInterval: selectedPlan.interval,
          successUrl: `${window.location.origin}/onboarding?step=8&success=true`,
          cancelUrl: `${window.location.origin}/onboarding?step=7&canceled=true`,
        },
      });
      if (error || !data?.url) {
        toast.error("Impossible de créer la session de paiement.");
        console.error("Checkout error:", error);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("Stripe checkout error:", err);
      toast.error("Erreur de paiement. Réessayez.");
    }
  }, [user, selectedPlan]);

  // Check for Stripe success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true" && params.get("step") === "8") {
      setStep(8);
      saveSession({ current_step: 8 });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [saveSession]);

  const overallProgress = modules.length > 0
    ? Math.round(modules.reduce((s, m) => s + m.progress, 0) / modules.length)
    : 0;

  if (sessionLoading) {
    return (
      <OnboardingShell currentStep={0} totalSteps={TOTAL_STEPS} showProgress={false}>
        <div className="dark min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs underline text-muted-foreground hover:text-foreground"
          >
            Continuer en mode limité
          </button>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell currentStep={step} totalSteps={TOTAL_STEPS} showProgress={step < 8}>
      {step === 0 && (
        <StepImportSources
          onImport={handleImport}
          onManual={() => {
            setBusinessName("Mon Entreprise");
            goToStep(3, { business_name: "Mon Entreprise" });
          }}
        />
      )}
      {step === 1 && (
        <StepRetrieval modules={modules} overallProgress={overallProgress} />
      )}
      {step === 2 && (
        <StepAuditResults sections={auditSections} onContinue={() => goToStep(3)} />
      )}
      {step === 3 && (
        <StepCompleteMissing data={businessData} onContinue={(updates) => {
          const score = calculateOnboardingAIPP(businessData);
          setAippScore(score);
          goToStep(4, { aipp_score: score as any });
        }} />
      )}
      {step === 4 && aippScore && (
        <StepAIPPReveal score={aippScore} onContinue={() => goToStep(5)} />
      )}
      {step === 5 && (
        <StepObjective onSelect={(obj) => {
          setObjective(obj);
          goToStep(6, { objective: obj });
        }} />
      )}
      {step === 6 && aippScore && (
        <StepPlanRecommendation
          aippScore={aippScore.total}
          objective={objective}
          onSelectPlan={(planId, interval) => {
            const p = PLAN_CATALOG[planId] || PLAN_CATALOG.recrue;
            const plan = { id: planId, name: p.name, price: interval === "month" ? p.monthlyPrice : p.yearlyPrice, interval };
            setSelectedPlan(plan);
            goToStep(7, { selected_plan: plan as any });
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
          onPay={handleStripeCheckout}
        />
      )}
      {step === 8 && (
        <StepActivation onComplete={() => {
          markComplete();
          goToStep(9);
        }} />
      )}
      {step === 9 && aippScore && (
        <StepDashboardLanding businessName={businessName || "Mon Entreprise"} aippScore={aippScore.total} />
      )}
    </OnboardingShell>
  );
}
