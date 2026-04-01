/**
 * OrbAlexVoicePrimary — Dominant voice CTA with breathing animation.
 * Auto-activates voice when available.
 */
import { motion } from "framer-motion";
import { Mic, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  voiceAvailable: boolean;
  onActivate: () => void;
  onDismiss: () => void;
  onSwitchToChat: () => void;
}

export default function OrbAlexVoicePrimary({
  voiceAvailable,
  onActivate,
  onDismiss,
  onSwitchToChat,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Breathing orb */}
      <motion.button
        onClick={voiceAvailable ? onActivate : onSwitchToChat}
        className="relative flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Outer glow rings */}
        <motion.div
          className="absolute h-32 w-32 rounded-full bg-primary/10"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute h-24 w-24 rounded-full bg-primary/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />

        {/* Main orb */}
        <motion.div
          className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-lg"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {voiceAvailable ? (
            <Mic className="h-8 w-8 text-primary-foreground" />
          ) : (
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          )}
        </motion.div>
      </motion.button>

      {/* Primary label */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-foreground">
          {voiceAvailable ? "Parlez à Alex" : "Discutez avec Alex"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {voiceAvailable
            ? "Décrivez votre projet par la voix. Alex vous guide en temps réel."
            : "Écrivez votre besoin. Alex vous aide à trouver la bonne solution."}
        </p>
      </div>

      {/* Primary CTA */}
      <Button
        size="lg"
        onClick={voiceAvailable ? onActivate : onSwitchToChat}
        className="gap-2 rounded-full px-8 h-12 text-base font-semibold"
      >
        {voiceAvailable ? (
          <>
            <Mic className="h-5 w-5" /> Commencer par la voix
          </>
        ) : (
          <>
            <MessageSquare className="h-5 w-5" /> Écrire à Alex
          </>
        )}
      </Button>

      {/* Secondary option */}
      {voiceAvailable && (
        <button
          onClick={onSwitchToChat}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Je préfère écrire
        </button>
      )}
    </div>
  );
}
