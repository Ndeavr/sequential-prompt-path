/**
 * AlexConciergeShell — Main orchestrator component for Alex V2.
 * Renders the right UI based on state machine resolution.
 * 
 * RULES:
 * - Alex never asks useless questions
 * - Each question unlocks an action
 * - No "3 soumissions", no "on vous rappelle"
 */
import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, AlertCircle, Eye } from "lucide-react";
import { useAlexConcierge } from "@/hooks/useAlexConcierge";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { audioEngine } from "@/services/audioEngineUNPRO";
import ModalInlineAuth from "./ModalInlineAuth";
import PanelPropertyForm from "./PanelPropertyForm";
import QuickIntentCards from "./QuickIntentCards";
import CardContractorTopMatch from "./CardContractorTopMatch";
import PanelBookingSmart from "./PanelBookingSmart";
import type { QuickIntent } from "@/services/alexStateMachine";

export default function AlexConciergeShell() {
  const {
    state,
    resolution,
    context,
    matchedContractor,
    isLoading,
    setIntent,
    setProperty,
    createBookingIntent,
    reset,
  } = useAlexConcierge();

  const { openAlex } = useAlexVoice();
  const [showAuth, setShowAuth] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  // Sonic identity: play sounds on state transitions
  useEffect(() => {
    if (state === "MATCHING") audioEngine.play("thinking");
    if (state === "MATCH_FOUND" || state === "BOOKING_READY") audioEngine.play("success");
    if (state === "NO_MATCH") audioEngine.play("notification");
    if (state === "ERROR") audioEngine.play("error");
  }, [state]);

  const handleIntentSelect = useCallback((intent: QuickIntent) => {
    setIntent(intent.label, intent.category);
  }, [setIntent]);

  const handleTextIntent = useCallback((text: string) => {
    setIntent(text);
  }, [setIntent]);

  const handleVoice = useCallback(() => {
    openAlex("concierge");
  }, [openAlex]);

  const handleBook = useCallback(() => {
    setShowBooking(true);
  }, []);

  const handleBookingConfirm = useCallback(async (datetime?: string) => {
    await createBookingIntent(datetime);
  }, [createBookingIntent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Greeting */}
      <AnimatePresence mode="wait">
        {resolution && (
          <motion.p
            key={state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-center text-lg font-medium text-foreground"
          >
            {resolution.greeting}
          </motion.p>
        )}
      </AnimatePresence>

      {/* State-based UI */}
      <AnimatePresence mode="wait">
        {state === "NOT_LOGGED" && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex justify-center">
              <button
                onClick={() => setShowAuth(true)}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                Créer mon accès gratuit
              </button>
            </div>
          </motion.div>
        )}

        {state === "LOGGED_NO_PROPERTY" && (
          <motion.div key="property" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PanelPropertyForm onSubmit={setProperty} />
          </motion.div>
        )}

        {state === "CONTEXT_UNKNOWN" && resolution?.quickIntents && (
          <motion.div key="intents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <QuickIntentCards intents={resolution.quickIntents} onSelect={handleIntentSelect} />
            
            {/* Voice CTA */}
            <div className="flex justify-center">
              <button
                onClick={handleVoice}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                Parler à Alex
              </button>
            </div>
          </motion.div>
        )}

        {state === "MATCHING" && (
          <motion.div key="matching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col items-center gap-3 py-8">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Eye className="h-7 w-7 text-primary" />
              </motion.div>
              <p className="text-sm text-muted-foreground">Je cherche le meilleur professionnel…</p>
            </div>
          </motion.div>
        )}

        {(state === "MATCH_FOUND" || state === "BOOKING_READY") && matchedContractor && !showBooking && (
          <motion.div key="match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CardContractorTopMatch
              contractor={matchedContractor}
              onBook={handleBook}
            />
          </motion.div>
        )}

        {showBooking && matchedContractor && (
          <motion.div key="booking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PanelBookingSmart
              contractor={matchedContractor}
              serviceType={context.intentDetected}
              onConfirm={handleBookingConfirm}
              onBack={() => setShowBooking(false)}
            />
          </motion.div>
        )}

        {state === "NO_MATCH" && (
          <motion.div key="no-match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-5 text-center max-w-md mx-auto">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">
                Aucun pro disponible pour ce niveau de qualité.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Je surveille et je t'avertis dès qu'un professionnel qualifié est disponible.
              </p>
              <button
                onClick={reset}
                className="text-xs text-primary font-medium hover:underline"
              >
                Essayer un autre besoin
              </button>
            </div>
          </motion.div>
        )}

        {state === "ERROR" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center py-6">
              <p className="text-sm text-destructive mb-2">Une erreur est survenue.</p>
              <button onClick={reset} className="text-xs text-primary font-medium hover:underline">
                Réessayer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth modal */}
      <AnimatePresence>
        {showAuth && (
          <ModalInlineAuth
            onClose={() => setShowAuth(false)}
            onSuccess={() => setShowAuth(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
