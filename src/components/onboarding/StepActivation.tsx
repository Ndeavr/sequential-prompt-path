import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onComplete: () => void;
}

const steps = [
  { label: "Sécurisation de votre catégorie", microcopy: "Cartographie du paysage concurrentiel…", emoji: "🗺️" },
  { label: "Synchronisation des signaux", microcopy: "Normalisation des signaux de service et catégorie…", emoji: "📡" },
  { label: "Construction du graphe d'identité", microcopy: "Croisement des marqueurs de confiance…", emoji: "🔗" },
  { label: "Enrichissement des signaux de confiance", microcopy: "Renforcement des couches de confiance…", emoji: "🛡️" },
  { label: "Génération des opportunités", microcopy: "Génération de votre structure de profil optimisée…", emoji: "📊" },
  { label: "Activation de votre présence UNPRO", microcopy: "Votre profil est en cours d'activation…", emoji: "⚡" },
];

export default function StepActivation({ onComplete }: Props) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [profilePct, setProfilePct] = useState(12);
  const [contractorCreated, setContractorCreated] = useState(false);

  // Create contractor profile on activation
  useEffect(() => {
    if (!user?.id || contractorCreated) return;
    (async () => {
      try {
        // Check if contractor already exists
        const { data: existing } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existing) {
          // Get onboarding session data
          const { data: session } = await supabase
            .from("contractor_onboarding_sessions")
            .select("*")
            .eq("user_id", user.id)
            .is("completed_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const businessData = (session?.business_data as Record<string, any>) || {};
          const businessName = session?.business_name || user.email || "Mon Entreprise";

          // Create contractor
          const { error } = await supabase
            .from("contractors")
            .insert({
              user_id: user.id,
              business_name: businessName,
              phone: businessData.phone?.value || null,
              email: businessData.email?.value || user.email || null,
              website: businessData.website?.value || null,
              city: businessData.city?.value || null,
              description: typeof businessData.description?.value === "string" ? businessData.description.value : null,
              specialty: typeof businessData.category?.value === "string" ? businessData.category.value : null,
            });

          if (error) console.error("Failed to create contractor:", error);
          else setContractorCreated(true);
        } else {
          setContractorCreated(true);
        }
      } catch (err) {
        console.error("Activation contractor creation error:", err);
      }
    })();
  }, [user?.id, contractorCreated]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(onComplete, 2000);
          return prev;
        }
        return prev + 1;
      });
      setProfilePct(prev => Math.min(100, prev + Math.round(88 / steps.length)));
    }, 2200);
    return () => clearInterval(interval);
  }, [onComplete]);

  const isComplete = currentStep >= steps.length - 1;

  return (
    <div className="dark min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-10">
        {/* Central orb — cinematic */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-36 h-36">
            {/* Multi-ring pulse */}
            <motion.div className="absolute inset-[-28px] rounded-full border border-primary/[0.06]"
              animate={{ scale: [1, 1.35, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 4, repeat: Infinity }} />
            <motion.div className="absolute inset-[-18px] rounded-full border border-accent/[0.1]"
              animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.05, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.5 }} />
            <motion.div className="absolute inset-[-10px] rounded-full border border-secondary/[0.08]"
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 1 }} />

            {/* Core glow */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 blur-3xl"
              animate={{
                scale: isComplete ? [1, 1.3, 1.1] : [1, 1.15, 1],
                opacity: isComplete ? [0.4, 0.8, 0.6] : [0.3, 0.5, 0.3],
              }}
              transition={{ duration: isComplete ? 1.5 : 3, repeat: isComplete ? 0 : Infinity }}
            />

            {/* Orbiting particles */}
            {[0, 120, 240].map((deg, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
                animate={{ rotate: 360 }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: "linear" }}
                style={{ top: "50%", left: "50%", transformOrigin: `0 ${-55 - i * 5}px`, rotate: deg }}
              />
            ))}

            {/* Inner display */}
            <div className="absolute inset-3 rounded-full bg-card border border-border/30 flex flex-col items-center justify-center shadow-[var(--shadow-xl)]">
              <motion.span
                key={profilePct}
                className="text-3xl font-bold font-display text-foreground"
              >
                {profilePct}%
              </motion.span>
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 font-medium">
                {isComplete ? "Prêt" : "Construction"}
              </span>
            </div>
          </div>

          {/* Dynamic microcopy */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="text-center space-y-1"
            >
              <p className="text-sm font-medium text-foreground">{steps[currentStep]?.microcopy}</p>
              <p className="text-[10px] text-muted-foreground/40">Étape {currentStep + 1} de {steps.length}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step list */}
        <div className="space-y-1.5">
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: i <= currentStep ? 1 : 0.2, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
                  active
                    ? "bg-primary/[0.06] border border-primary/20"
                    : done
                    ? "border border-success/10 bg-success/[0.02]"
                    : "border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? "bg-success/15" : active ? "bg-primary/15" : "bg-muted/10"
                }`}>
                  {done ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <span className="text-[10px]">{step.emoji}</span>
                  )}
                </div>
                <span className={`text-sm transition-colors ${
                  done ? "text-success/80" : active ? "text-foreground font-medium" : "text-muted-foreground/30"
                }`}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Final celebration */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="text-center space-y-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 1, stiffness: 200 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary via-accent to-secondary text-white text-sm font-bold shadow-[var(--shadow-glow-lg)]"
              >
                <Sparkles className="w-4 h-4" /> Profil activé
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-xs text-muted-foreground/60"
              >
                Redirection vers votre tableau de bord…
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
