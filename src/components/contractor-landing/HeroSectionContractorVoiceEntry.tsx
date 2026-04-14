import { Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props {
  onVoiceStart: () => void;
  onChatStart: () => void;
}

export default function HeroSectionContractorVoiceEntry({ onVoiceStart, onChatStart }: Props) {
  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-4 text-center overflow-hidden">
      {/* Gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg mx-auto space-y-6"
      >
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Score de visibilité IA gratuit
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
          Découvrez comment l'IA vous perçoit
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
          Obtenez votre score de visibilité sur ChatGPT, Gemini et les recherches IA.
          Recevez vos premiers rendez-vous qualifiés.
        </p>

        {/* Voice CTA — Primary */}
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <Button
            size="lg"
            onClick={onVoiceStart}
            className="h-14 px-8 text-base font-semibold rounded-2xl gap-3 w-full sm:w-auto shadow-lg"
          >
            <div className="relative">
              <Mic className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
            </div>
            Parler à Alex maintenant
          </Button>
        </motion.div>

        {/* Chat CTA — Secondary */}
        <Button
          variant="ghost"
          onClick={onChatStart}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Continuer par chat →
        </Button>

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-4 pt-4 text-xs text-muted-foreground">
          <span>✓ Gratuit, 30 secondes</span>
          <span>✓ Aucun engagement</span>
          <span>✓ Résultats instantanés</span>
        </div>
      </motion.div>
    </section>
  );
}
