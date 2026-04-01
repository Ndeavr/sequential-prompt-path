/**
 * SectionAlexActivation — Persistent Alex engagement section.
 * Voice-first with chat fallback, positioned as the key conversion driver.
 */
import { motion } from "framer-motion";
import { Mic, MessageSquare, Sparkles, ArrowRight, Shield, Zap, Heart } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { Link } from "react-router-dom";

const ALEX_CAPABILITIES = [
  { icon: Zap, label: "Diagnostic instantané", desc: "Identifie votre problème en secondes" },
  { icon: Shield, label: "Match vérifié", desc: "Trouve le bon pro, pas n'importe lequel" },
  { icon: Heart, label: "Zéro friction", desc: "Rendez-vous garanti, sans formulaire" },
];

export default function SectionAlexActivation({ sectionRef }: { sectionRef?: React.RefObject<HTMLElement> }) {
  const { openAlex } = useAlexVoice();

  return (
    <section ref={sectionRef} className="px-5 py-14 md:py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-[22px] sm:text-[28px] md:text-[36px] font-bold text-foreground leading-tight">
            Alex, votre <span className="text-primary">concierge IA</span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Disponible 24/7. Parlez, écrivez ou laissez-le faire.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-5"
        >
          {/* Alex orb CTA */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 text-center">
            {/* Animated orb */}
            <div className="relative mx-auto mb-6 flex items-center justify-center">
              <motion.div
                className="absolute h-28 w-28 rounded-full bg-primary/10"
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute h-20 w-20 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
              <motion.button
                onClick={() => openAlex("general")}
                className="relative z-10 h-16 w-16 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </motion.button>
            </div>

            <h3 className="font-display text-lg font-bold text-foreground mb-1">
              Bonjour, je suis Alex.
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              Dites-moi ce qui se passe chez vous. Je m'occupe du reste.
            </p>

            {/* Primary CTA */}
            <button
              onClick={() => openAlex("general")}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold cta-gradient mb-3"
            >
              <Mic className="h-4 w-4" /> Parler à Alex
            </button>

            {/* Secondary options */}
            <div className="flex gap-2">
              <Link
                to="/describe-project"
                className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Écrire
              </Link>
              <Link
                to="/match"
                className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-all"
              >
                Match instantané <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-3 gap-3">
            {ALEX_CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-3 text-center"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center mx-auto mb-2">
                  <cap.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs font-bold text-foreground leading-tight">{cap.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{cap.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
