/**
 * Module 4 — Checkout Success: "Parfait. On commence."
 * Shown after Stripe redirect. Activates plan + shows next steps.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles, Calendar, BarChart3, MessageCircle, ArrowRight, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ACTIVATION_STEPS = [
  { code: "payment", title: "Paiement reçu", icon: CheckCircle },
  { code: "plan_active", title: "Plan activé", icon: Sparkles },
  { code: "profile", title: "Profil complété", icon: CheckCircle },
  { code: "calendar", title: "Agenda connecté", icon: Calendar },
  { code: "appointments", title: "Rendez-vous activés", icon: Rocket },
];

export default function PageCheckoutSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const planCode = params.get("plan") || "pro";
  const [activating, setActivating] = useState(true);
  const [stepsDone, setStepsDone] = useState<string[]>([]);

  // Simulate activation sequence
  useEffect(() => {
    const steps = ["payment", "plan_active"];
    const delays = [600, 1200, 2000];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setStepsDone((prev) => [...prev, step]);
      }, delays[i] || 600 * (i + 1));
    });

    setTimeout(() => setActivating(false), 2000);

    // Persist activation (best-effort)
    (async () => {
      try {
        if (!session?.user?.id) return;
        const { data: contractor } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!contractor) return;

        await supabase.from("plan_activations").insert({
          contractor_id: contractor.id,
          plan_code: planCode,
          activation_status: "active",
          activated_at: new Date().toISOString(),
        });

        // Create activation steps
        const stepsToInsert = ACTIVATION_STEPS.map((s, i) => ({
          contractor_id: contractor.id,
          step_code: s.code,
          title: s.title,
          status: ["payment", "plan_active"].includes(s.code) ? "done" : "pending",
          sort_order: i,
        }));
        await supabase.from("activation_steps").insert(stepsToInsert);

        // Send payment success email (best-effort)
        const email = session?.user?.email;
        if (email) {
          const planNames: Record<string, string> = {
            recrue: "Recrue", pro: "Pro", premium: "Premium", elite: "Élite", signature: "Signature",
          };
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "payment-success",
              recipientEmail: email,
              idempotencyKey: `payment-success-${contractor.id}-${planCode}`,
              templateData: {
                planName: planNames[planCode] || planCode,
              },
            },
          });
        }
      } catch {}
    })();
  }, [session?.user?.id, planCode]);

  const PLAN_NAMES: Record<string, string> = {
    recrue: "Recrue", pro_acq: "Pro", premium_acq: "Premium", elite_acq: "Élite", signature: "Signature",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6 pb-36">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="text-center space-y-4 pt-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"
          >
            <CheckCircle className="w-12 h-12 text-green-500" />
          </motion.div>
          <h1 className="text-3xl font-black text-foreground">Parfait. On commence.</h1>
          <p className="text-base text-muted-foreground">
            Votre plan <span className="font-bold text-foreground">{PLAN_NAMES[planCode] || planCode}</span> est activé.
            Voici les prochaines étapes.
          </p>
        </motion.div>

        {/* Activation checklist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
        >
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Activation en cours
          </p>
          <div className="space-y-3">
            {ACTIVATION_STEPS.map((step, i) => {
              const isDone = stepsDone.includes(step.code);
              const isActive = !isDone && activating && i === stepsDone.length;
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.code}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                    isDone ? "bg-green-500/20" :
                    isActive ? "bg-primary/20" : "bg-muted/50"
                  )}>
                    {isActive ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : isDone ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    isDone ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                  {isDone && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-bold text-green-500 ml-auto"
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Timeline */}
        {!activating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
          >
            <p className="text-sm font-bold text-foreground">Prochaines étapes</p>
            <div className="space-y-3">
              {[
                { time: "Maintenant", action: "Profil + plan actifs", done: true },
                { time: "Prochaine étape", action: "Connecter votre agenda", done: false },
                { time: "Ensuite", action: "Rendez-vous qualifiés activés", done: false },
                { time: "Après", action: "Cockpit et suivi", done: false },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2",
                      item.done ? "bg-green-500 border-green-500" : "border-muted-foreground bg-transparent"
                    )} />
                    {i < 3 && <div className="w-px h-6 bg-border/50" />}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{item.time}</p>
                    <p className={cn("text-sm font-medium", item.done ? "text-foreground" : "text-muted-foreground")}>{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Appointments ready banner */}
        {!activating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Rendez-vous qualifiés prêts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  On peut vous livrer des rendez-vous qualifiés, directement dans votre agenda, sans avoir à parler au client avant.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Alex welcome */}
        {!activating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-border/50 bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Alex</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bienvenue! Votre plan {PLAN_NAMES[planCode] || planCode} est activé. Je suis là pour vous guider dans les prochaines étapes. Connectez votre agenda et vous serez prêt à recevoir des rendez-vous.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sticky CTAs */}
      {!activating && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/30 p-4">
          <div className="max-w-lg mx-auto space-y-2">
            <Button
              size="lg"
              variant="premium"
              className="w-full h-12 rounded-xl text-base"
              onClick={() => navigate("/activation")}
            >
              <Calendar className="w-4 h-4 mr-2" /> Connecter mon agenda
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-xl text-sm"
                onClick={() => navigate("/pro/dashboard")}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1" /> Mon cockpit
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-xl text-sm"
                onClick={() => navigate("/alex/voice/realtime")}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" /> Parler à Alex
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
