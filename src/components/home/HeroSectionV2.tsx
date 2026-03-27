/**
 * HeroSectionV2 — Premium hero for UNPRO homepage V2.
 */
import { motion } from "framer-motion";
import { ArrowRight, Shield, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/services/eventTrackingService";

interface Props {
  onAlexClick: () => void;
}

export default function HeroSectionV2({ onAlexClick }: Props) {
  const navigate = useNavigate();

  const handleCta = (dest: string, label: string) => {
    trackEvent({ eventType: "rendezvous_click", category: "hero", metadata: { label, destination: dest } });
    navigate(dest);
  };

  return (
    <section className="relative overflow-hidden px-5 pt-16 pb-10 md:pt-24 md:pb-16">
      {/* BG decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] right-[-20%] w-[70%] h-[120%] rounded-full blur-[100px] bg-primary/8" />
        <div className="absolute bottom-[-20%] left-[-15%] w-[50%] h-[80%] rounded-full blur-[80px] bg-accent/6" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="font-display text-[1.75rem] sm:text-4xl md:text-5xl font-bold text-foreground leading-[1.15] tracking-tight">
            Trouvez le bon professionnel.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Sans bruit.
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-[15px] sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
        >
          L'IA d'UnPRO analyse votre besoin, vérifie les entrepreneurs et vous propose les meilleurs — prêts à intervenir.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <button
            onClick={() => handleCta("/search", "Trouver un entrepreneur")}
            className="w-full sm:w-auto h-13 rounded-full px-8 text-sm font-bold cta-gradient flex items-center justify-center gap-2"
          >
            Trouver un entrepreneur
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCta("/verifier-entrepreneur", "Vérifier un entrepreneur")}
            className="w-full sm:w-auto h-13 rounded-full px-8 text-sm font-bold bg-card border-2 border-border text-foreground hover:border-primary/30 transition-all flex items-center justify-center gap-2"
          >
            <Shield className="h-4 w-4 text-success" />
            Vérifier un entrepreneur
          </button>
        </motion.div>

        {/* Alex micro CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center justify-center"
        >
          <button
            onClick={onAlexClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 hover:bg-muted border border-border/60 transition-all text-sm text-muted-foreground hover:text-foreground"
          >
            <Mic className="h-3.5 w-3.5 text-primary" />
            <span>Parler à Alex — Ex: <em className="text-foreground/70">Isolation grenier, fuite toiture…</em></span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
