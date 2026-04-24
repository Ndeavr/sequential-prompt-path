import { Mic, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props {
  onVoiceStart: () => void;
  onChatStart: () => void;
}

export default function HeroSectionContractorVoiceEntry({ onVoiceStart, onChatStart }: Props) {
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-2xl mx-auto space-y-6"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          Pour les entrepreneurs du Québec
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-foreground leading-[1.05]">
          Plus de contrats grâce à{" "}
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            l'intelligence artificielle
          </span>
          .
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          UNPRO aide les entrepreneurs du Québec à être trouvés plus souvent, choisis plus souvent
          et à remplir leur calendrier.
        </p>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
        >
          <Button
            size="lg"
            onClick={onChatStart}
            className="h-14 px-8 text-base font-semibold rounded-2xl gap-2 shadow-[var(--shadow-glow)] bg-gradient-to-r from-primary to-secondary hover:opacity-95"
          >
            Voir mon potentiel gratuit
            <ArrowRight className="w-5 h-5" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={onVoiceStart}
            className="h-14 px-6 text-base font-semibold rounded-2xl gap-3 border-primary/30"
          >
            <div className="relative">
              <Mic className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
            </div>
            Parler à Alex
          </Button>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-4 text-xs text-muted-foreground">
          <span>✓ Gratuit, 30 secondes</span>
          <span>✓ Aucun engagement</span>
          <span>✓ Résultats instantanés</span>
        </div>
      </motion.div>
    </section>
  );
}
