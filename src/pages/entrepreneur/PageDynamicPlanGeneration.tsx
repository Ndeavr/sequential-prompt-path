import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { GrowthProfileWizard, type GrowthProfileInput } from "@/features/dynamicPricing/components/GrowthProfileWizard";
import { DynamicPlanReveal } from "@/features/dynamicPricing/components/DynamicPlanReveal";
import { toast } from "sonner";

type Phase = "intro" | "wizard" | "analyzing" | "reveal";

export default function PageDynamicPlanGeneration() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [recommendation, setRecommendation] = useState<any>(null);

  async function handleGenerate(profile: GrowthProfileInput) {
    setPhase("analyzing");
    try {
      const { data, error } = await supabase.functions.invoke("api_generate_dynamic_plan", {
        body: { growth_profile: profile },
      });
      if (error) throw error;
      // brief cinematic pause
      await new Promise((r) => setTimeout(r, 1800));
      setRecommendation(data.recommendation);
      setPhase("reveal");
    } catch (e: any) {
      toast.error("Analyse impossible pour le moment. Réessayez dans un instant.");
      console.error(e);
      setPhase("wizard");
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      {/* cinematic bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 w-[60%] h-[60%] bg-[radial-gradient(circle,_hsla(210,100%,55%,0.18),_transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-[60%] h-[60%] bg-[radial-gradient(circle,_hsla(180,100%,55%,0.14),_transparent_60%)]" />
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.section
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl mx-auto px-6 py-20 text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white/70 mb-8">
                Consultation stratégique IA
              </div>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">
                Votre Plan IA personnalisé
              </h1>
              <p className="text-white/70 text-lg mb-10 leading-relaxed">
                Optimisé selon votre métier, votre territoire, votre capacité réelle et votre marché.
                Pas un forfait générique. Une stratégie de rendez-vous exclusive.
              </p>
              <button
                onClick={() => setPhase("wizard")}
                className="px-8 py-4 rounded-2xl bg-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,70%)] text-black font-medium transition-all hover:-translate-y-0.5"
              >
                Démarrer l'analyse
              </button>
            </motion.section>
          )}

          {phase === "wizard" && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GrowthProfileWizard onComplete={handleGenerate} />
            </motion.div>
          )}

          {phase === "analyzing" && (
            <motion.section
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto px-6 py-32 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-8 rounded-full border-2 border-white/10 border-t-[hsl(210,100%,65%)]"
              />
              <h2 className="text-2xl font-semibold mb-3">Analyse marché en cours…</h2>
              <p className="text-white/60 text-sm">
                Compétition, demande, exclusivité, ticket moyen, rareté territoriale.
              </p>
            </motion.section>
          )}

          {phase === "reveal" && recommendation && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <DynamicPlanReveal
                recommendation={recommendation}
                onCustom={() => {
                  // Hand off to Alex for custom plan consultation
                  window.dispatchEvent(
                    new CustomEvent("alex:open", {
                      detail: { mode: "custom_plan_consultation", language: "fr" },
                    }),
                  );
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
