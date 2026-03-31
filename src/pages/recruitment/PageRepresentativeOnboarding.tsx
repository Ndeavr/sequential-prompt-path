/**
 * UNPRO — Representative Onboarding Page
 * Full flow for reps importing contractor profiles in the field.
 * Steps: path_select → seed_capture → consent → importing → profile_reveal → corrections → activation
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Bot, ArrowLeft } from "lucide-react";
import { transitions } from "@/lib/motion";

import StepPathSelector from "@/components/rep-onboarding/StepPathSelector";
import StepSeedCapture from "@/components/rep-onboarding/StepSeedCapture";
import StepConsent from "@/components/rep-onboarding/StepConsent";
import StepImportExecution from "@/components/rep-onboarding/StepImportExecution";
import StepProfileReveal from "@/components/rep-onboarding/StepProfileReveal";
import StepCorrections from "@/components/rep-onboarding/StepCorrections";
import StepActivation from "@/components/rep-onboarding/StepActivation";

export type ImportStep =
  | "path_select" | "seed_capture" | "consent"
  | "importing" | "profile_reveal" | "corrections" | "activation";

export type ImportMode = "self_import" | "representative_import";

export interface SeedData {
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  google_business_url: string;
  rbq_number: string;
  neq_number: string;
  rep_name: string;
}

export interface ImportSessionState {
  step: ImportStep;
  mode: ImportMode;
  seed: SeedData;
  sessionId: string | null;
  contractorId: string | null;
  importProgress: number;
  importedData: Record<string, any> | null;
  importModules: any[];
  aippScore: number | null;
  consents: { data_structuring: boolean; manual_validation: boolean; secure_link: boolean };
}

const INITIAL_STATE: ImportSessionState = {
  step: "path_select",
  mode: "representative_import",
  seed: {
    business_name: "", contact_name: "", phone: "", email: "",
    website: "", google_business_url: "", rbq_number: "", neq_number: "", rep_name: "",
  },
  sessionId: null,
  contractorId: null,
  importProgress: 0,
  importedData: null,
  importModules: [],
  aippScore: null,
  consents: { data_structuring: false, manual_validation: false, secure_link: false },
};

const STEP_ORDER: ImportStep[] = [
  "path_select", "seed_capture", "consent", "importing",
  "profile_reveal", "corrections", "activation",
];

const ALEX_MESSAGES: Record<ImportStep, (mode: ImportMode) => string> = {
  path_select: () => "Bienvenue. Choisissez comment vous souhaitez importer le profil entrepreneur.",
  seed_capture: (m) => m === "representative_import"
    ? "Entrez les informations de l'entrepreneur. Même un site web ou un nom d'entreprise suffit pour commencer."
    : "Donnez-moi ce que vous avez. Même avec seulement votre site web, je peux commencer l'import.",
  consent: (m) => m === "representative_import"
    ? "Avec l'accord de l'entrepreneur, je lance l'import du profil privé. Rien n'est publié sans contrôle."
    : "Avant de lancer l'import, j'ai besoin de votre accord. Rien n'est publié sans votre validation.",
  importing: () => "Analyse multi-source en cours. Je récupère vos données publiques pour structurer votre profil AIPP.",
  profile_reveal: () => "Votre profil initial est prêt. Voici ce que j'ai pu structurer pour cette entreprise.",
  corrections: () => "Certaines données peuvent être améliorées immédiatement. Plus le profil est précis, plus le score AIPP augmente.",
  activation: () => "La base est prête. Choisissez la prochaine étape : profil privé, aperçu public ou activation de plan.",
};

export default function PageRepresentativeOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<ImportSessionState>(() => {
    try {
      const saved = sessionStorage.getItem("unpro_rep_onboarding");
      return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : INITIAL_STATE;
    } catch { return INITIAL_STATE; }
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("unpro_rep_onboarding", JSON.stringify(state));
  }, [state]);

  const update = useCallback((patch: Partial<ImportSessionState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const goTo = useCallback((step: ImportStep) => update({ step }), [update]);

  const stepIndex = STEP_ORDER.indexOf(state.step);
  const progress = Math.round((stepIndex / (STEP_ORDER.length - 1)) * 100);

  // ─── Create import session in DB ───
  const createSession = useCallback(async () => {
    setIsProcessing(true);
    try {
      const hasIdentifier = state.seed.business_name || state.seed.website || state.seed.google_business_url || state.seed.phone;
      if (!hasIdentifier) {
        toast.error("Ajoutez au moins un élément pour lancer l'import.");
        setIsProcessing(false);
        return;
      }

      const { data, error } = await supabase
        .from("contractor_import_sessions" as any)
        .insert({
          import_mode: state.mode,
          contractor_business_name: state.seed.business_name || "Inconnu",
          contractor_contact_name: state.seed.contact_name || null,
          contractor_phone: state.seed.phone || null,
          contractor_email: state.seed.email || null,
          domain_url: state.seed.website || null,
          google_business_url: state.seed.google_business_url || null,
          rbq_number: state.seed.rbq_number || null,
          neq_number: state.seed.neq_number || null,
          consent_source: state.mode === "representative_import" ? "representative" : "self",
          initiated_by_user_id: user?.id || null,
          initiated_by_rep_id: state.mode === "representative_import" ? user?.id : null,
          import_status: "collecting_inputs",
        } as any)
        .select("id")
        .single();

      if (error) throw error;
      update({ sessionId: (data as any).id });
      goTo("consent");
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "Impossible de créer la session"));
    } finally { setIsProcessing(false); }
  }, [state.seed, state.mode, user?.id, update, goTo]);

  // ─── Save consents ───
  const saveConsents = useCallback(async () => {
    if (!state.sessionId) return;
    setIsProcessing(true);
    try {
      const consentEntries = Object.entries(state.consents).filter(([, v]) => v);
      for (const [type] of consentEntries) {
        await supabase.from("contractor_import_consents" as any).insert({
          import_session_id: state.sessionId,
          consent_type: type,
          consent_value: true,
          captured_by: state.mode === "representative_import" ? "representative" : "self",
        } as any);
      }

      await supabase.from("contractor_import_sessions" as any)
        .update({ consent_status: "accepted", import_status: "waiting_consent" } as any)
        .eq("id", state.sessionId);

      goTo("importing");
      startImport();
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    } finally { setIsProcessing(false); }
  }, [state.sessionId, state.consents, state.mode, goTo]);

  // ─── Start real import ───
  const startImport = useCallback(async () => {
    if (!state.sessionId) return;
    try {
      await supabase.from("contractor_import_sessions" as any)
        .update({ import_status: "importing" } as any)
        .eq("id", state.sessionId);

      const { data: importResult } = await supabase.functions.invoke("onboarding-import", {
        body: {
          importForm: {
            businessName: state.seed.business_name,
            website: state.seed.website || undefined,
            phone: state.seed.phone,
            city: "",
          },
        },
      });

      const businessData = importResult?.businessData || {};
      const modules = importResult?.modules || [];

      // Create contractor profile
      const contractorInsert: Record<string, any> = {
        business_name: state.seed.business_name,
        phone: state.seed.phone || null,
        email: state.seed.email || null,
        website: state.seed.website || null,
        user_id: state.mode === "self_import" ? user?.id : null,
      };

      if (businessData.description?.value) {
        contractorInsert.description = typeof businessData.description.value === "string"
          ? businessData.description.value.substring(0, 1000)
          : `${state.seed.business_name} — entreprise de services professionnels.`;
      }
      if (businessData.address?.value) contractorInsert.city = businessData.address.value;
      if (businessData.rating?.value) contractorInsert.rating = businessData.rating.value;
      if (businessData.reviewCount?.value) contractorInsert.review_count = businessData.reviewCount.value;
      if (businessData.googleMapsUri?.value) contractorInsert.google_business_url = businessData.googleMapsUri.value;

      const { data: contractor, error: cErr } = await supabase
        .from("contractors")
        .insert(contractorInsert)
        .select("id")
        .single();

      if (cErr) throw cErr;

      const aippScore = Math.floor(Math.random() * 30 + 45); // Simulated initial AIPP

      await supabase.from("contractor_import_sessions" as any)
        .update({
          import_status: "completed",
          completion_percent: 100,
          private_profile_id: contractor.id,
        } as any)
        .eq("id", state.sessionId);

      update({
        contractorId: contractor.id,
        importProgress: 100,
        importedData: businessData,
        importModules: modules,
        aippScore,
      });
    } catch (e: any) {
      console.error("Import error:", e);
      update({ importProgress: 100, importedData: {}, importModules: [], aippScore: 35 });
      await supabase.from("contractor_import_sessions" as any)
        .update({ import_status: "failed" } as any)
        .eq("id", state.sessionId);
    }
  }, [state.sessionId, state.seed, state.mode, user?.id, update]);

  // ─── Simulate progress during import ───
  useEffect(() => {
    if (state.step !== "importing") return;
    if (!state.importedData && state.importProgress < 90) {
      const iv = setInterval(() => {
        setState((prev) => {
          if (prev.importedData || prev.importProgress >= 90) return prev;
          return { ...prev, importProgress: Math.min(prev.importProgress + Math.random() * 6 + 2, 90) };
        });
      }, 900);
      return () => clearInterval(iv);
    }
    if (state.importedData) {
      const t = setTimeout(() => goTo("profile_reveal"), 2500);
      return () => clearTimeout(t);
    }
  }, [state.step, state.importedData, state.importProgress, goTo]);

  const canGoBack = stepIndex > 0 && state.step !== "importing" && state.step !== "profile_reveal";

  const goBack = useCallback(() => {
    if (canGoBack) {
      goTo(STEP_ORDER[stepIndex - 1]);
    }
  }, [canGoBack, stepIndex, goTo]);

  return (
    <>
      <Helmet>
        <title>Import profil entrepreneur — UNPRO</title>
        <meta name="description" content="Importez un profil entrepreneur en moins d'une minute avec UNPRO. Score AIPP, signaux de confiance et activation instantanée." />
      </Helmet>
      <div className="min-h-screen bg-background">
        {/* Progress bar */}
        <div className="fixed top-0 inset-x-0 z-50 h-1 bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6 pb-32">
          {/* Back button */}
          {canGoBack && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={goBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </motion.button>
          )}

          {/* Alex orb */}
          <div className="flex items-start gap-3 pt-2">
            <motion.div
              className="relative flex-shrink-0"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
            </motion.div>
            <motion.div
              key={state.step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 rounded-2xl rounded-tl-md bg-card border border-border/40 p-4 shadow-sm"
            >
              <p className="text-[11px] font-semibold text-primary mb-1">Alex</p>
              <p className="text-sm text-foreground leading-relaxed">
                {ALEX_MESSAGES[state.step](state.mode)}
              </p>
            </motion.div>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              {state.step === "path_select" && (
                <StepPathSelector
                  mode={state.mode}
                  onSelect={(mode) => { update({ mode }); goTo("seed_capture"); }}
                />
              )}

              {state.step === "seed_capture" && (
                <StepSeedCapture
                  seed={state.seed}
                  mode={state.mode}
                  onUpdate={(s) => update({ seed: { ...state.seed, ...s } })}
                  onContinue={createSession}
                  isProcessing={isProcessing}
                />
              )}

              {state.step === "consent" && (
                <StepConsent
                  mode={state.mode}
                  repName={state.seed.rep_name}
                  consents={state.consents}
                  onUpdate={(c) => update({ consents: { ...state.consents, ...c } })}
                  onAccept={saveConsents}
                  isProcessing={isProcessing}
                />
              )}

              {state.step === "importing" && (
                <StepImportExecution
                  progress={state.importProgress}
                  modules={state.importModules}
                  businessName={state.seed.business_name}
                  website={state.seed.website}
                />
              )}

              {state.step === "profile_reveal" && (
                <StepProfileReveal
                  seed={state.seed}
                  importedData={state.importedData}
                  aippScore={state.aippScore}
                  onContinue={() => goTo("corrections")}
                />
              )}

              {state.step === "corrections" && (
                <StepCorrections
                  seed={state.seed}
                  importedData={state.importedData}
                  contractorId={state.contractorId}
                  onUpdate={(s) => update({ seed: { ...state.seed, ...s } })}
                  onContinue={() => goTo("activation")}
                  isProcessing={isProcessing}
                />
              )}

              {state.step === "activation" && (
                <StepActivation
                  mode={state.mode}
                  seed={state.seed}
                  contractorId={state.contractorId}
                  sessionId={state.sessionId}
                  aippScore={state.aippScore}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
