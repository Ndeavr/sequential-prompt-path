/**
 * PanelAlexVoiceChat — Embedded Alex voice/chat panel for intent funnel.
 */
import { motion } from "framer-motion";
import { Mic, MessageCircle } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

export default function PanelAlexVoiceChat() {
  const { openAlex } = useAlexVoice();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8"
      >
        {/* Voice orb */}
        <motion.button
          onClick={() => openAlex("intent_conversation")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-28 h-28 mx-auto rounded-full
            bg-gradient-to-br from-primary to-accent
            flex items-center justify-center
            shadow-[0_0_60px_hsl(var(--primary)/0.4)]
            hover:shadow-[0_0_80px_hsl(var(--primary)/0.5)]
            transition-shadow duration-500"
        >
          <Mic className="w-10 h-10 text-primary-foreground" />
        </motion.button>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Parlez à Alex</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Décrivez votre situation en quelques mots. Alex comprend et trouve la solution.
          </p>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground text-xs max-w-xs mx-auto">
          <div className="flex-1 h-px bg-border" />
          <span>ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={() => openAlex("intent_text")}
          className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl
            bg-muted/50 border border-border/60 text-muted-foreground
            hover:bg-muted hover:text-foreground transition-all text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Écrire à Alex
        </button>
      </motion.div>
    </div>
  );
}
