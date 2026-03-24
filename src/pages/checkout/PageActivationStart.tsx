/**
 * Module 4 — Activation Start Page
 * Calendar connection, first steps, dashboard entry.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Check, ArrowRight, BarChart3, MessageCircle, Sparkles, Clock, Shield, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function PageActivationStart() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Load activation steps
  const [steps, setSteps] = useState([
    { code: "plan_confirmed", title: "Plan confirmé", status: "done" },
    { code: "profile_complete", title: "Profil complété", status: "done" },
    { code: "calendar_connected", title: "Agenda connecté", status: "pending" },
    { code: "appointments_ready", title: "Rendez-vous qualifiés activés", status: "pending" },
    { code: "cockpit_ready", title: "Cockpit accessible", status: "done" },
  ]);

  const handleConnectCalendar = async () => {
    setConnecting(true);
    // Simulated — in production, this would use Google Calendar OAuth
    await new Promise((r) => setTimeout(r, 2000));
    setCalendarConnected(true);
    setConnecting(false);
    setSteps((prev) =>
      prev.map((s) =>
        s.code === "calendar_connected" ? { ...s, status: "done" } :
        s.code === "appointments_ready" ? { ...s, status: "done" } : s
      )
    );
  };

  const allDone = steps.every((s) => s.status === "done");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3">
          <p className="text-sm font-bold text-foreground">Mise en route</p>
          <p className="text-xs text-muted-foreground">Dernières étapes avant vos premiers rendez-vous</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-36">
        {/* Plan status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Plan activé</p>
              <p className="text-xs text-muted-foreground">Paiement reçu • Accès ouvert</p>
            </div>
          </div>
        </motion.div>

        {/* Activation checklist */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
        >
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Checklist d'activation
          </p>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={step.code} className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  step.status === "done" ? "bg-green-500/20" : "bg-muted/50"
                )}>
                  {step.status === "done" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  step.status === "done" ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
                {step.status === "done" && (
                  <span className="text-[10px] font-bold text-green-500 ml-auto">✓</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Calendar connection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {calendarConnected ? "Agenda connecté!" : "Connecter votre agenda"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {calendarConnected
                  ? "Vos rendez-vous seront synchronisés automatiquement."
                  : "Recevez des rendez-vous directs dans votre agenda. Évitez les conflits. Activez l'auto-booking."
                }
              </p>
            </div>
          </div>

          {!calendarConnected && (
            <div className="space-y-2">
              <div className="space-y-1.5">
                {[
                  "Recevoir des rendez-vous directs",
                  "Éviter les conflits d'horaire",
                  "Activer l'auto-booking",
                ].map((reason, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-green-500 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={handleConnectCalendar}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                {connecting ? "Connexion..." : "Connecter Google Calendar"}
              </Button>
            </div>
          )}

          {calendarConnected && (
            <div className="rounded-xl bg-green-500/10 p-3 text-center">
              <p className="text-xs font-bold text-green-600">✓ Synchronisation active</p>
            </div>
          )}
        </motion.div>

        {/* Dashboard entry */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border/50 bg-card p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Votre cockpit</p>
              <p className="text-xs text-muted-foreground">Suivez vos rendez-vous, votre score AIPP et votre visibilité.</p>
            </div>
          </div>
        </motion.div>

        {/* Appointments banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 p-4"
        >
          <p className="text-sm font-bold text-foreground">🚀 Rendez-vous qualifiés prêts</p>
          <p className="text-xs text-muted-foreground mt-1">
            On peut vous livrer des rendez-vous qualifiés, directement dans votre agenda, sans avoir à parler au client avant.
          </p>
        </motion.div>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/30 p-4">
        <div className="max-w-lg mx-auto space-y-2">
          <Button
            size="lg"
            variant="premium"
            className="w-full h-12 rounded-xl text-base"
            onClick={() => navigate("/pro/dashboard")}
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Entrer dans mon cockpit
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full h-10 rounded-xl text-sm"
            onClick={() => navigate("/alex/voice/realtime")}
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Parler à Alex
          </Button>
        </div>
      </div>
    </div>
  );
}
