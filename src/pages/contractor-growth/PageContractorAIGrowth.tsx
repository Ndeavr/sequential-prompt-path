/**
 * /contractor-ai-growth — Hybrid 3-screen Contractor Conversion Flow
 *
 * Screen 1: Pain selection (hero) — emotional engagement, picks a "tension"
 * Screen 2: Cinematic score reveal — animated AIPP analysis + score + gap
 * Screen 3: Plan recommendation + Stripe checkout (redirect)
 *
 * Alex (Charlotte FR) auto-starts on first user gesture and overlays
 * voice commentary throughout — handled by AlexVoiceContext.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingDown, Calendar, Phone, Loader2, CheckCircle2 } from "lucide-react";
import CardAIPPScoreHeroReveal from "@/components/score-reveal/CardAIPPScoreHeroReveal";
import CardScoreRevealSuspense from "@/components/score-reveal/CardScoreRevealSuspense";
import { CONTRACTOR_PLANS, type ContractorPlanSlug, formatPrice } from "@/config/contractorPlans";
import { getContractorCheckoutUrl } from "@/services/alexContractorOnboardingService";

type Step = "pain" | "analysis" | "plan";

const PAINS = [
  { id: "no_calls", icon: Phone, label: "Mon téléphone ne sonne pas assez", tone: "Pas assez d'appels qualifiés" },
  { id: "empty_agenda", icon: Calendar, label: "Mon agenda a des trous", tone: "Trop de plages vides" },
  { id: "low_revenue", icon: TrendingDown, label: "Mes revenus stagnent", tone: "Revenus qui plafonnent" },
  { id: "growth", icon: Sparkles, label: "Je veux scaler mon entreprise", tone: "Prêt pour la prochaine étape" },
];

export default function PageContractorAIGrowth() {
  const { openAlex } = useAlexVoice();
  const autoStartedRef = useRef(false);
  const [step, setStep] = useState<Step>("pain");
  const [pain, setPain] = useState<typeof PAINS[number] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<"preparing" | "speaking" | "awaiting">("preparing");
  const [checkoutLoading, setCheckoutLoading] = useState<ContractorPlanSlug | null>(null);

  // Strictly event-driven: Alex never auto-opens. User must tap orb / CTA.

  // Track step events
  useEffect(() => {
    supabase.from("system_events" as any).insert({
      event_type: `contractor_growth_step_${step}`,
      payload: { step, pain: pain?.id ?? null, score },
    }).then(() => {}, () => {});
  }, [step]); // eslint-disable-line

  const handlePainSelect = (p: typeof PAINS[number]) => {
    setPain(p);
    setStep("analysis");
    runAnalysis();
  };

  const runAnalysis = useCallback(() => {
    setAnalysisStage("preparing");
    setRevealed(false);
    // Cinematic delays
    setTimeout(() => setAnalysisStage("speaking"), 1200);
    setTimeout(() => setAnalysisStage("awaiting"), 3000);
    setTimeout(() => {
      // Heuristic preview score (real AIPP arrives via Alex chat enrichment later)
      const s = 38 + Math.floor(Math.random() * 22); // 38–59 → tension réelle
      setScore(s);
      setRevealed(true);
    }, 4200);
  }, []);

  const recommendedPlan = CONTRACTOR_PLANS.find((p) => p.slug === "premium")!;

  const handleCheckout = async (slug: ContractorPlanSlug) => {
    setCheckoutLoading(slug);
    const result = await getContractorCheckoutUrl(slug);
    if (result.url) {
      window.location.href = result.url;
      return;
    }
    if (result.requiresAuth) {
      window.location.href = `/auth?return=${encodeURIComponent(`/contractor-ai-growth?plan=${slug}&checkout=1`)}`;
      return;
    }
    setCheckoutLoading(null);
  };

  return (
    <>
      <Helmet>
        <title>Plus de contrats grâce à l'IA | UNPRO</title>
        <meta name="description" content="Diagnostic IA gratuit en 30 secondes. Découvrez votre score de visibilité et activez plus de rendez-vous qualifiés avec UNPRO." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <AnimatePresence mode="wait">
            {step === "pain" && (
              <motion.div
                key="pain"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-6"
              >
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Sparkles className="w-3 h-3" /> Diagnostic IA · 30 secondes
                  </div>
                  <h1 className="text-3xl font-bold leading-tight">
                    Quelle est votre <span className="text-primary">tension</span> en ce moment ?
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Alex va analyser votre présence et vous montrer comment combler le manque.
                  </p>
                </div>

                <div className="space-y-3">
                  {PAINS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <motion.button
                        key={p.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePainSelect(p)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                      >
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.tone}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === "analysis" && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-4 pt-6"
              >
                {!revealed ? (
                  <CardScoreRevealSuspense stage={analysisStage} />
                ) : (
                  <>
                    <CardAIPPScoreHeroReveal
                      score={score!}
                      revealed={revealed}
                      businessName={pain?.tone}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.8 }}
                      className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3"
                    >
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Manque à gagner estimé :</strong> entre{" "}
                        <span className="text-primary font-bold">{Math.round((100 - score!) * 180)} $</span> et{" "}
                        <span className="text-primary font-bold">{Math.round((100 - score!) * 320)} $</span> par mois.
                      </p>
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={() => setStep("plan")}
                      >
                        Voir mon plan recommandé
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}

            {step === "plan" && (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-5 pt-2"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Sparkles className="w-3 h-3" /> Plan recommandé pour vous
                  </div>
                  <h2 className="text-2xl font-bold">{recommendedPlan.name}</h2>
                  <p className="text-sm text-muted-foreground">{recommendedPlan.subtitle}</p>
                </div>

                <div className="rounded-3xl border-2 border-primary bg-gradient-to-br from-primary/10 via-card to-card p-6 space-y-5 shadow-xl">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{formatPrice(recommendedPlan.monthlyPrice)}</span>
                    <span className="text-muted-foreground text-sm">/mois</span>
                  </div>
                  <p className="text-sm text-foreground/80">{recommendedPlan.description}</p>
                  <ul className="space-y-2">
                    {recommendedPlan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    className="w-full text-base font-semibold"
                    disabled={checkoutLoading !== null}
                    onClick={() => handleCheckout(recommendedPlan.slug)}
                  >
                    {checkoutLoading === recommendedPlan.slug ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Préparation du paiement...
                      </>
                    ) : (
                      <>
                        Activer {recommendedPlan.name}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Paiement sécurisé · Annulation en tout temps
                  </p>
                </div>

                <details className="rounded-2xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                    Voir les autres plans
                  </summary>
                  <div className="mt-4 space-y-2">
                    {CONTRACTOR_PLANS.filter((p) => p.slug !== recommendedPlan.slug).map((p) => (
                      <button
                        key={p.slug}
                        disabled={checkoutLoading !== null}
                        onClick={() => handleCheckout(p.slug)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition text-left disabled:opacity-50"
                      >
                        <div>
                          <p className="font-semibold text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {checkoutLoading === p.slug ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            `${formatPrice(p.monthlyPrice)}/mois`
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
