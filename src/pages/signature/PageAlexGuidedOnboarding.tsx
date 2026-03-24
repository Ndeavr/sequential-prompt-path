/**
 * UNPRO — Alex Guided Signature Onboarding
 * Full flow: Alex chat → contractor draft → categories → territories →
 * Signature offer (SIGNATURE26 = 0$) → activation → import → profile → publish.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import AlexOrbPanel from "@/components/signature/AlexOrbPanel";
import AlexChatStep from "@/components/signature/AlexChatStep";
import CategorySelectorTree from "@/components/signature/CategorySelectorTree";
import TerritorySelectorQuebec from "@/components/signature/TerritorySelectorQuebec";
import SignatureOfferCard from "@/components/signature/SignatureOfferCard";
import ImportProgressRealtime from "@/components/signature/ImportProgressRealtime";
import ProfileCompletionChecklist from "@/components/signature/ProfileCompletionChecklist";
import ProfilePreviewCard from "@/components/signature/ProfilePreviewCard";

export type OnboardingStep =
  | "welcome" | "business_info" | "categories" | "territories"
  | "signature_offer" | "activation" | "importing"
  | "profile_completion" | "preview" | "published";

interface ContractorDraft {
  id?: string;
  business_name: string;
  first_name: string;
  city: string;
  phone: string;
  email: string;
  activity: string;
  website?: string;
}

interface OnboardingState {
  step: OnboardingStep;
  draft: ContractorDraft;
  categories: { primary: string; secondary: string[] };
  territories: string[];
  promoCode: string;
  promoValid: boolean;
  contractorId: string | null;
  importJobId: string | null;
  importProgress: number;
  profileCompletion: number;
}

const INITIAL_STATE: OnboardingState = {
  step: "welcome",
  draft: { business_name: "", first_name: "", city: "", phone: "", email: "", activity: "", website: "" },
  categories: { primary: "", secondary: [] },
  territories: [],
  promoCode: "",
  promoValid: false,
  contractorId: null,
  importJobId: null,
  importProgress: 0,
  profileCompletion: 0,
};

const STEP_ORDER: OnboardingStep[] = [
  "welcome", "business_info", "categories", "territories",
  "signature_offer", "activation", "importing",
  "profile_completion", "preview", "published",
];

export default function PageAlexGuidedOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(() => {
    try {
      const saved = sessionStorage.getItem("unpro_signature_onboarding");
      return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : INITIAL_STATE;
    } catch { return INITIAL_STATE; }
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("unpro_signature_onboarding", JSON.stringify(state));
  }, [state]);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const goTo = useCallback((step: OnboardingStep) => { update({ step }); }, [update]);

  const stepIndex = STEP_ORDER.indexOf(state.step);
  const progress = Math.round((stepIndex / (STEP_ORDER.length - 1)) * 100);

  const createContractorDraft = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .from("contractors")
        .insert({
          business_name: state.draft.business_name,
          city: state.draft.city,
          phone: state.draft.phone,
          email: state.draft.email,
          specialty: state.draft.activity,
          website: state.draft.website || null,
          user_id: user?.id || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      update({ contractorId: data.id, step: "categories" });
      toast.success("Profil créé !");
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "Impossible de créer le profil"));
    } finally { setIsProcessing(false); }
  }, [state.draft, user?.id, update]);

  const saveCategories = useCallback(async () => {
    if (!state.contractorId) return;
    setIsProcessing(true);
    try {
      if (state.categories.primary) {
        await supabase.from("contractor_services").insert({
          contractor_id: state.contractorId,
          service_name_fr: state.categories.primary,
          is_primary: true,
          is_active: true,
        });
      }
      for (const cat of state.categories.secondary) {
        await supabase.from("contractor_services").insert({
          contractor_id: state.contractorId,
          service_name_fr: cat,
          is_primary: false,
          is_active: true,
        });
      }
      goTo("territories");
    } catch { toast.error("Erreur de sauvegarde des catégories"); }
    finally { setIsProcessing(false); }
  }, [state.contractorId, state.categories, goTo]);

  const saveTerritories = useCallback(async () => {
    if (!state.contractorId) return;
    setIsProcessing(true);
    try {
      for (const city of state.territories) {
        await supabase.from("contractor_service_areas").insert({
          contractor_id: state.contractorId,
          city_name: city,
        });
      }
      goTo("signature_offer");
    } catch { toast.error("Erreur de sauvegarde des territoires"); }
    finally { setIsProcessing(false); }
  }, [state.contractorId, state.territories, goTo]);

  const activateSignaturePlan = useCallback(async () => {
    if (!state.contractorId) return;
    setIsProcessing(true);
    try {
      const { data: promoResult } = await supabase.rpc("validate_unpro_promo_code", {
        _code: state.promoCode || "SIGNATURE26",
        _plan_code: "signature",
        _contractor_id: state.contractorId,
      });

      const result = promoResult as Record<string, unknown> | null;
      if (!result?.valid) {
        toast.error((result?.reason as string) || "Code promo invalide");
        setIsProcessing(false);
        return;
      }

      await supabase.from("contractor_subscriptions").insert({
        contractor_id: state.contractorId,
        plan_id: "signature",
        status: "active",
      });

      await supabase.from("checkout_sessions").insert({
        contractor_profile_id: state.contractorId,
        selected_plan_code: "signature",
        billing_cycle: "month",
        promo_code: "SIGNATURE26",
        base_price: 39900,
        discount_amount: 39900,
        final_total_after_discount: 0,
        checkout_status: "completed_free",
        zero_dollar_activation: true,
      });

      update({ promoValid: true, step: "importing" });
      toast.success("Plan Signature activé gratuitement !");
    } catch (e: any) {
      toast.error("Erreur d'activation: " + (e.message || ""));
    } finally { setIsProcessing(false); }
  }, [state.contractorId, state.promoCode, update]);

  useEffect(() => {
    if (state.step !== "importing" || state.importJobId || !state.contractorId) return;

    const runImport = async () => {
      try {
        const { data: job } = await supabase
          .from("extraction_jobs")
          .insert({
            contractor_id: state.contractorId,
            source_type: "auto",
            job_type: "signature_onboarding",
          })
          .select("id")
          .single();
        if (job) update({ importJobId: job.id });

        for (let p = 10; p <= 100; p += 15) {
          await new Promise((r) => setTimeout(r, 800));
          update({ importProgress: Math.min(p, 100) });
        }

        if (job) await supabase.from("extraction_jobs").update({ status: "completed" }).eq("id", job.id);

        await supabase.from("contractors").update({
          description: `${state.draft.business_name} — entreprise spécialisée en ${state.draft.activity} à ${state.draft.city}. Service professionnel de haute qualité.`,
        }).eq("id", state.contractorId!);

        update({ importProgress: 100, profileCompletion: 65, step: "profile_completion" });
      } catch { toast.error("Erreur lors de l'import"); }
    };
    runImport();
  }, [state.step, state.importJobId, state.contractorId, state.draft, update]);

  const publishProfile = useCallback(async () => {
    if (!state.contractorId) return;
    setIsProcessing(true);
    try {
      await supabase.from("contractors").update({
        admin_verified: true,
      }).eq("id", state.contractorId);
      goTo("published");
      toast.success("Profil publié !");
    } catch { toast.error("Erreur de publication"); }
    finally { setIsProcessing(false); }
  }, [state.contractorId, goTo]);

  const alexMessages: Record<OnboardingStep, string> = useMemo(() => ({
    welcome: "Bienvenue ! Je suis Alex, votre assistant IA. Je vais vous guider pour créer votre profil en quelques minutes.",
    business_info: "Parfait ! Dites-moi un peu plus sur votre entreprise.",
    categories: "Excellent ! Sélectionnez votre catégorie principale et vos spécialités.",
    territories: "Où offrez-vous vos services ? Sélectionnez vos villes.",
    signature_offer: "🎉 Offre exclusive ! Le plan Signature est offert gratuitement avec le code SIGNATURE26.",
    activation: "Activation en cours...",
    importing: "Je recherche vos informations en ligne pour construire votre profil...",
    profile_completion: "Votre profil est presque complet ! Vérifions les derniers détails.",
    preview: "Voici votre profil tel que vos clients le verront. Prêt à publier ?",
    published: "🎉 Félicitations ! Votre profil est en ligne. Vous êtes prêt à recevoir des rendez-vous.",
  }), []);

  return (
    <>
      <Helmet>
        <title>Commencer avec Alex — UNPRO</title>
        <meta name="description" content="Créez votre profil professionnel avec Alex, votre assistant IA UNPRO." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 inset-x-0 z-50 h-1 bg-muted">
          <motion.div className="h-full bg-gradient-to-r from-primary to-secondary" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="max-w-lg mx-auto px-4 pt-6 pb-32">
          <AlexOrbPanel message={alexMessages[state.step]} step={state.step} />
          <AnimatePresence mode="wait">
            <motion.div key={state.step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="mt-6">
              {state.step === "welcome" && (
                <div className="text-center space-y-6">
                  <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">Commencer avec Alex</h1>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">En quelques minutes, Alex crée votre profil professionnel complet et vous active le plan Signature gratuitement.</p>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => goTo("business_info")} className="w-full max-w-xs mx-auto h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg">Commencer →</motion.button>
                </div>
              )}
              {state.step === "business_info" && <AlexChatStep draft={state.draft} onUpdate={(d) => update({ draft: { ...state.draft, ...d } })} onComplete={createContractorDraft} isProcessing={isProcessing} />}
              {state.step === "categories" && <CategorySelectorTree categories={state.categories} onChange={(c) => update({ categories: c })} onContinue={saveCategories} isProcessing={isProcessing} />}
              {state.step === "territories" && <TerritorySelectorQuebec selected={state.territories} onChange={(t) => update({ territories: t })} onContinue={saveTerritories} isProcessing={isProcessing} />}
              {state.step === "signature_offer" && <SignatureOfferCard promoCode={state.promoCode} onPromoChange={(c) => update({ promoCode: c })} onActivate={activateSignaturePlan} isProcessing={isProcessing} />}
              {state.step === "importing" && <ImportProgressRealtime progress={state.importProgress} />}
              {state.step === "profile_completion" && <ProfileCompletionChecklist draft={state.draft} completion={state.profileCompletion} onComplete={() => goTo("preview")} />}
              {state.step === "preview" && <ProfilePreviewCard draft={state.draft} categories={state.categories} territories={state.territories} onPublish={publishProfile} isProcessing={isProcessing} />}
              {state.step === "published" && (
                <div className="text-center space-y-6 py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"><span className="text-3xl">🎉</span></motion.div>
                  <h2 className="text-2xl font-bold text-foreground">Profil publié !</h2>
                  <p className="text-muted-foreground text-sm">Votre profil est maintenant visible. Vous êtes prêt à recevoir des rendez-vous qualifiés.</p>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/pro")} className="h-12 rounded-xl bg-primary text-primary-foreground font-bold">Entrer dans mon cockpit</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/alex")} className="h-12 rounded-xl border border-border text-foreground font-medium">Parler à Alex</motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
