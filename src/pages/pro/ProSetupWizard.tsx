/**
 * UNPRO — Contractor Post-Signup Setup Wizard
 * 6 steps: Profile → Services → Zones → Documents → Photos → Activation
 */
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useContractorProfile, useUpsertContractorProfile } from "@/hooks/useContractor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import SetupStepProfile from "@/components/pro-setup/SetupStepProfile";
import SetupStepServices from "@/components/pro-setup/SetupStepServices";
import SetupStepZones from "@/components/pro-setup/SetupStepZones";
import SetupStepDocuments from "@/components/pro-setup/SetupStepDocuments";
import SetupStepPhotos from "@/components/pro-setup/SetupStepPhotos";
import SetupStepActivation from "@/components/pro-setup/SetupStepActivation";

const TOTAL_STEPS = 6;

const STEP_LABELS = [
  "Profil",
  "Services",
  "Zones",
  "Documents",
  "Photos",
  "Activation",
];

export default function ProSetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading, refetch } = useContractorProfile();
  const upsert = useUpsertContractorProfile();
  const [step, setStep] = useState(0);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  const handleComplete = useCallback(() => {
    toast.success("Votre profil est prêt ! Bienvenue sur UNPRO.");
    navigate("/pro");
  }, [navigate]);

  if (isLoading) {
    return (
      <OnboardingShell currentStep={0} totalSteps={TOTAL_STEPS} showProgress={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell currentStep={step} totalSteps={TOTAL_STEPS}>
      {/* Step pills */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-4">
        <div className="flex gap-1.5 mb-2">
          {STEP_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => i <= step && setStep(i)}
              className={`flex-1 py-1 rounded-full text-[10px] font-medium tracking-wide transition-all ${
                i === step
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : i < step
                  ? "bg-primary/20 text-primary cursor-pointer"
                  : "bg-muted/30 text-muted-foreground/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-24">
        {step === 0 && (
          <SetupStepProfile
            profile={profile}
            onSave={async (data) => {
              await upsert.mutateAsync(data);
              await refetch();
              goNext();
            }}
            saving={upsert.isPending}
          />
        )}
        {step === 1 && (
          <SetupStepServices
            contractorId={profile?.id}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 2 && (
          <SetupStepZones
            contractorId={profile?.id}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 3 && (
          <SetupStepDocuments
            userId={user?.id}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 4 && (
          <SetupStepPhotos
            contractorId={profile?.id}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 5 && (
          <SetupStepActivation
            profile={profile}
            onComplete={handleComplete}
            onBack={goBack}
          />
        )}
      </div>
    </OnboardingShell>
  );
}
