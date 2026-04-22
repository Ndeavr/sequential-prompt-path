/**
 * Screen 9 — Activation Success Dashboard
 * Post-payment activation with remaining optimizations.
 */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Trophy, Sparkles, Bot, Calendar, Image, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";

const NEXT_ACTIONS = [
  { icon: Image, label: "Ajouter des photos avant/après", impact: "+12 points", done: false },
  { icon: Shield, label: "Vérifier votre licence RBQ", impact: "+8 points", done: false },
  { icon: Calendar, label: "Connecter votre calendrier", impact: "+6 points", done: false },
  { icon: Sparkles, label: "Compléter la description IA", impact: "+5 points", done: false },
];

export default function ScreenSuccess() {
  const navigate = useNavigate();
  const { state, overallCompletion } = useActivationFunnel();

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      {/* Success animation */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Profil activé! 🎉
        </h1>
        <p className="text-sm text-muted-foreground">
          Votre profil {state.selected_plan ? `Plan ${state.selected_plan.charAt(0).toUpperCase() + state.selected_plan.slice(1)}` : "UNPRO"} est en cours d'activation.
        </p>
      </motion.div>

      {/* Score progress */}
      <motion.div
        className="rounded-xl border border-border/50 bg-card/50 p-4 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Complétude du profil</span>
          <span className="text-sm font-bold text-primary">{overallCompletion}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${overallCompletion}%` }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />
        </div>
      </motion.div>

      {/* Next optimizations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Prochaines optimisations
        </h2>
        <div className="space-y-2 mb-6">
          {NEXT_ACTIONS.map((action, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/50"
            >
              <action.icon className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground">{action.label}</p>
                <p className="text-xs text-emerald-500">{action.impact}</p>
              </div>
              {action.done ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTAs */}
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-xl"
          onClick={() => navigate("/pro")}
        >
          Aller au tableau de bord
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 rounded-xl border-primary/30"
          onClick={() => {/* Open Alex */}}
        >
          <Bot className="w-5 h-5 mr-2 text-primary" />
          Continuer avec Alex
        </Button>
      </div>
    </div>
  );
}
