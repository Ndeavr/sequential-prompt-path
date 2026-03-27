/**
 * UNPRO — Alex Guided Signature Onboarding
 * Full flow: Alex chat → contractor draft → categories → territories →
 * Signature offer (SIGNATURE26 = 0$) → activation → real import → profile → publish.
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

export interface ImportedField {
  value: any;
  state: "imported" | "inferred" | "needs_confirmation" | "missing" | "confirmed";
  source: string;
  confidence: number;
}

export interface ImportedBusinessData {
  [key: string]: ImportedField;
}

export interface ImportModule {
  id: string;
  label: string;
  status: string;
  progress: number;
  messages: string[];
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
  importedData: ImportedBusinessData | null;
  importModules: ImportModule[];
  importStarted: boolean;
  detectedCategory: string | null;
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
  importedData: null,
  importModules: [],
  importStarted: false,
  detectedCategory: null,
};

// Map activity keywords to known categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Isolation": ["isolation", "isoler", "cellulose", "uréthane", "entretoit", "grenier", "laine"],
  "Plomberie": ["plomberie", "plombier", "tuyau", "débouchage", "chauffe-eau"],
  "Électricité": ["électricité", "électricien", "panneau", "filage", "borne"],
  "Toiture": ["toiture", "toit", "couvreur", "bardeau", "membrane"],
  "Peinture": ["peinture", "peintre", "teinture"],
  "Rénovation générale": ["rénovation", "rénov", "construction", "entrepreneur général"],
  "Chauffage & Climatisation": ["chauffage", "climatisation", "thermopompe", "fournaise", "hvac", "ventilation"],
  "Fondation & Structure": ["fondation", "fissure", "drain français", "imperméabilisation"],
  "Aménagement extérieur": ["paysag", "pavé", "clôture", "terrasse", "aménagement"],
  "Portes & Fenêtres": ["porte", "fenêtre", "vitre"],
  "Revêtement extérieur": ["revêtement", "vinyle", "crépi", "maçonnerie"],
  "Excavation & Terrassement": ["excavation", "terrassement", "nivellement"],
  "Béton & Maçonnerie": ["béton", "maçon", "brique", "dalle"],
  "Plancher & Céramique": ["plancher", "céramique", "bois franc", "sablage"],
  "Piscine & Spa": ["piscine", "spa"],
  "Nettoyage professionnel": ["nettoyage", "ménage", "sinistre"],
  "Notaire": ["notaire"],
  "Courtier immobilier": ["courtier", "immobilier"],
};

function detectCategory(activity: string): string | null {
  const q = activity.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) return cat;
  }
  return null;
}

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

  // ─── Background import (fire and forget) ───
  const startBackgroundImport = useCallback(async (contractorId: string) => {
    if (state.importStarted) return;
    update({ importStarted: true });
    try {
      const { data: importResult } = await supabase.functions.invoke("onboarding-import", {
        body: {
          importForm: {
            businessName: state.draft.business_name,
            website: state.draft.website || undefined,
            phone: state.draft.phone,
            city: state.draft.city,
          },
        },
      });

      const businessData: ImportedBusinessData = importResult?.businessData || {};
      const modules: ImportModule[] = importResult?.modules || [];

      // Enrich contractor profile
      const profileUpdates: Record<string, any> = {};
      if (businessData.description?.value) {
        profileUpdates.description = typeof businessData.description.value === "string"
          ? businessData.description.value.substring(0, 1000)
          : `${state.draft.business_name} — entreprise spécialisée en ${state.draft.activity} à ${state.draft.city}.`;
      } else {
        profileUpdates.description = `${state.draft.business_name} — entreprise spécialisée en ${state.draft.activity} à ${state.draft.city}. Service professionnel de haute qualité.`;
      }
      if (businessData.address?.value) profileUpdates.address = businessData.address.value;
      if (businessData.rating?.value) profileUpdates.rating = businessData.rating.value;
      if (businessData.reviewCount?.value) profileUpdates.review_count = businessData.reviewCount.value;
      if (businessData.website?.value && !state.draft.website) profileUpdates.website = businessData.website.value;
      if (businessData.phone?.value && !state.draft.phone) profileUpdates.phone = businessData.phone.value;
      if (businessData.businessHours?.value) profileUpdates.description += `\n\nHoraires : ${businessData.businessHours.value}`;
      const googleUrl = importResult?.businessData?.googleMapsUri?.value;
      if (googleUrl) profileUpdates.google_business_url = googleUrl;

      await supabase.from("contractors").update(profileUpdates).eq("id", contractorId);

      const importedFieldCount = Object.values(businessData).filter(
        (f: ImportedField) => f.state !== "missing"
      ).length;
      const totalFields = Object.keys(businessData).length;
      const completionPct = Math.round((importedFieldCount / Math.max(totalFields, 1)) * 100);

      update({
        importProgress: 100,
        importedData: businessData,
        importModules: modules,
        profileCompletion: Math.max(completionPct, 40),
      });
    } catch (e) {
      console.error("Background import error:", e);
      update({ importProgress: 100, importedData: {}, importModules: [], profileCompletion: 35 });
    }
  }, [state.importStarted, state.draft, update]);

  // ─── Step: Create contractor draft ───
  const createContractorDraft = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Detect category from activity
      const detected = detectCategory(state.draft.activity);
      const categoryPatch = detected
        ? { categories: { primary: detected, secondary: [] }, detectedCategory: detected }
        : {};

      let cid: string;

      // If user already has a contractor row, update it instead of inserting
      if (user?.id) {
        const { data: existing } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          await supabase.from("contractor_services").delete().eq("contractor_id", existing.id);
          await supabase.from("contractor_service_areas").delete().eq("contractor_id", existing.id);
          const { error } = await supabase
            .from("contractors")
            .update({
              business_name: state.draft.business_name,
              city: state.draft.city,
              phone: state.draft.phone,
              email: state.draft.email,
              specialty: state.draft.activity,
              website: state.draft.website || null,
              description: null, rating: null, review_count: null, address: null, google_business_url: null,
            })
            .eq("id", existing.id);
          if (error) throw error;
          cid = existing.id;
        } else {
          const { data, error } = await supabase
            .from("contractors")
            .insert({
              business_name: state.draft.business_name,
              city: state.draft.city,
              phone: state.draft.phone,
              email: state.draft.email,
              specialty: state.draft.activity,
              website: state.draft.website || null,
              user_id: user.id,
            })
            .select("id")
            .single();
          if (error) throw error;
          cid = data.id;
        }
      } else {
        const { data, error } = await supabase
          .from("contractors")
          .insert({
            business_name: state.draft.business_name,
            city: state.draft.city,
            phone: state.draft.phone,
            email: state.draft.email,
            specialty: state.draft.activity,
            website: state.draft.website || null,
            user_id: null,
          })
          .select("id")
          .single();
        if (error) throw error;
        cid = data.id;
      }

      update({ contractorId: cid, step: "categories", ...categoryPatch });
      toast.success("Profil créé — recherche en cours...");

      // Start import in background immediately
      startBackgroundImport(cid);
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "Impossible de créer le profil"));
    } finally { setIsProcessing(false); }
  }, [state.draft, user?.id, update, startBackgroundImport]);

  // ─── Step: Save categories ───
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

  // ─── Step: Save territories ───
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

  // ─── Step: Activate Signature plan ───
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

      // If import already done in background, skip to profile_completion
      if (state.importedData) {
        update({ promoValid: true, step: "profile_completion" });
      } else {
        update({ promoValid: true, step: "importing" });
      }
      toast.success("Plan Signature activé gratuitement !");
    } catch (e: any) {
      toast.error("Erreur d'activation: " + (e.message || ""));
    } finally { setIsProcessing(false); }
  }, [state.contractorId, state.promoCode, update]);

  // ─── Step: When on "importing" step, wait for background import to finish ───
  useEffect(() => {
    if (state.step !== "importing") return;
    if (state.importedData) {
      // Import already done, move on
      goTo("profile_completion");
    }
  }, [state.step, state.importedData, goTo]);
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

  // ─── Alex messages per step ───
  const alexMessages: Record<OnboardingStep, string> = useMemo(() => ({
    welcome: "Bienvenue ! Je suis Alex, votre assistant IA. Je vais vous guider pour créer votre profil en quelques minutes.",
    business_info: "Parfait ! Dites-moi un peu plus sur votre entreprise.",
    categories: "Excellent ! Sélectionnez votre catégorie principale et vos spécialités.",
    territories: "Où offrez-vous vos services ? Sélectionnez vos villes.",
    signature_offer: "🎉 Offre exclusive ! Le plan Signature est offert gratuitement avec le code SIGNATURE26.",
    activation: "Activation en cours...",
    importing: "Je recherche vos informations en ligne pour construire votre profil. Cela prend quelques secondes...",
    profile_completion: "Voici ce que j'ai trouvé ! Vérifiez les informations et complétez ce qui manque.",
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
        {/* Progress bar */}
        <div className="fixed top-0 inset-x-0 z-50 h-1 bg-muted">
          <motion.div className="h-full bg-gradient-to-r from-primary to-secondary" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6 pb-32">
          <AlexOrbPanel message={alexMessages[state.step]} step={state.step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              {/* Welcome */}
              {state.step === "welcome" && (
                <div className="text-center space-y-6">
                  <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                    Commencer avec Alex
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    En quelques minutes, Alex crée votre profil professionnel complet et vous active le plan Signature gratuitement.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goTo("business_info")}
                    className="w-full max-w-xs mx-auto h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg"
                  >
                    Commencer →
                  </motion.button>
                </div>
              )}

              {/* Business info chat */}
              {state.step === "business_info" && (
                <AlexChatStep
                  draft={state.draft}
                  onUpdate={(d) => update({ draft: { ...state.draft, ...d } })}
                  onComplete={createContractorDraft}
                  isProcessing={isProcessing}
                />
              )}

              {/* Categories */}
              {state.step === "categories" && (
                <CategorySelectorTree
                  categories={state.categories}
                  onChange={(c) => update({ categories: c })}
                  onContinue={saveCategories}
                  isProcessing={isProcessing}
                  detectedPrimary={state.detectedCategory}
                  importRunning={state.importStarted && !state.importedData}
                />
              )}

              {/* Territories */}
              {state.step === "territories" && (
                <TerritorySelectorQuebec
                  selected={state.territories}
                  onChange={(t) => update({ territories: t })}
                  onContinue={saveTerritories}
                  isProcessing={isProcessing}
                />
              )}

              {/* Signature offer */}
              {state.step === "signature_offer" && (
                <SignatureOfferCard
                  promoCode={state.promoCode}
                  onPromoChange={(c) => update({ promoCode: c })}
                  onActivate={activateSignaturePlan}
                  isProcessing={isProcessing}
                />
              )}

              {/* Import in progress */}
              {state.step === "importing" && (
                <ImportProgressRealtime
                  progress={state.importProgress}
                  modules={state.importModules}
                />
              )}

              {/* Profile completion */}
              {state.step === "profile_completion" && (
                <ProfileCompletionChecklist
                  draft={state.draft}
                  completion={state.profileCompletion}
                  importedData={state.importedData}
                  importModules={state.importModules}
                  contractorId={state.contractorId}
                  onComplete={() => goTo("preview")}
                />
              )}

              {/* Preview */}
              {state.step === "preview" && (
                <ProfilePreviewCard
                  draft={state.draft}
                  categories={state.categories}
                  territories={state.territories}
                  importedData={state.importedData}
                  onPublish={publishProfile}
                  isProcessing={isProcessing}
                />
              )}

              {/* Published */}
              {state.step === "published" && (
                <div className="text-center space-y-6 py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
                  >
                    <span className="text-3xl">🎉</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground">Profil publié !</h2>
                  <p className="text-muted-foreground text-sm">
                    Votre profil est maintenant visible. Vous êtes prêt à recevoir des rendez-vous qualifiés.
                  </p>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/pro")}
                      className="h-12 rounded-xl bg-primary text-primary-foreground font-bold"
                    >
                      Entrer dans mon cockpit
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/alex")}
                      className="h-12 rounded-xl border border-border text-foreground font-medium"
                    >
                      Parler à Alex
                    </motion.button>
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
