/**
 * HeroSection — Dark premium space-themed hero
 * Voice-first with centered microphone orb, quick action buttons, and glass effects.
 */
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAlexVoiceSession } from "@/hooks/useAlexVoiceSession";
import { Link } from "react-router-dom";
import { Mic, Volume2, VolumeX, Loader2, Keyboard, Square, Camera, FileText, Search } from "lucide-react";
import unproRobot from "@/assets/unpro-robot.png";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";

const CHIP_GREETINGS: Record<string, string> = {
  "Rénovation": "vous cherchez à rénover ?",
  "Construction": "vous cherchez à construire ?",
  "Toiture": "vous avez un projet de toiture ?",
  "Cuisine": "vous voulez refaire votre cuisine ?",
  "Électricité": "vous avez besoin d'un électricien ?",
  "Plomberie": "vous cherchez un plombier ?",
};

const QUICK_ACTIONS = [
  { icon: Camera, label: "Analyser mon problème", route: "/describe-project" },
  { icon: FileText, label: "Comparer mes soumissions", route: "/dashboard/quotes/upload" },
  { icon: Search, label: "Vérifier un entrepreneur", route: "/verify" },
];

export default function HeroSection() {
  const { user } = useAuth();
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [textSheetChip, setTextSheetChip] = useState<string | undefined>();

  const {
    state: orbState,
    sessionActive: voiceActive,
    openSession,
    closeSession,
    muteSpeech,
    sttSupported,
  } = useAlexVoiceSession();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";
  const greeting = firstName ? `Bonjour ${firstName}.` : "Bonjour.";

  const startVoice = useCallback((chip?: string) => {
    if (!sttSupported) {
      setTextSheetChip(chip);
      setTextSheetOpen(true);
      return;
    }
    const chipGreet = chip ? CHIP_GREETINGS[chip] : undefined;
    const greetText = chipGreet
      ? `${greeting.replace(".", ",")} ${chipGreet}`
      : `${greeting} Quel projet avez-vous en tête ?`;
    openSession(greetText);
  }, [sttSupported, greeting, openSession]);

  const stopVoice = useCallback(() => {
    closeSession();
  }, [closeSession]);

  const statusText =
    orbState === "speaking" ? "Alex vous parle…"
      : orbState === "thinking" ? "Alex réfléchit…"
      : orbState === "listening" ? "Je vous écoute…"
      : "Parlez à Alex";

  return (
    <>
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden px-5 py-16">
        {/* ── Subtle overlay effects (transparent — uses persistent bg) ── */}
        <div className="absolute inset-0">
          {/* Star field subtle */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(1px 1px at 20% 30%, hsl(220 20% 93% / 0.4) 0%, transparent 100%), radial-gradient(1px 1px at 70% 20%, hsl(220 20% 93% / 0.3) 0%, transparent 100%), radial-gradient(1px 1px at 40% 70%, hsl(220 20% 93% / 0.2) 0%, transparent 100%), radial-gradient(1px 1px at 80% 60%, hsl(220 20% 93% / 0.35) 0%, transparent 100%), radial-gradient(1px 1px at 10% 80%, hsl(220 20% 93% / 0.25) 0%, transparent 100%), radial-gradient(1px 1px at 55% 45%, hsl(220 20% 93% / 0.3) 0%, transparent 100%)",
          }} />
          {/* Horizon glow */}
          <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{
            background: "linear-gradient(0deg, hsl(222 100% 65% / 0.08) 0%, transparent 100%)",
          }} />
          {/* Central orb ambient */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full" style={{
            background: "radial-gradient(circle, hsl(222 100% 65% / 0.06) 0%, transparent 70%)",
          }} />
          {/* Horizontal light streak */}
          <div className="absolute top-[55%] left-0 right-0 h-px" style={{
            background: "linear-gradient(90deg, transparent 5%, hsl(222 100% 70% / 0.2) 30%, hsl(195 100% 60% / 0.25) 50%, hsl(222 100% 70% / 0.2) 70%, transparent 95%)",
          }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto w-full">
          {/* ── Logo ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <img src={unproRobot} alt="UNPRO" className="h-20 w-20 mx-auto drop-shadow-[0_0_30px_rgba(63,123,255,0.4)]" />
          </motion.div>

          {/* ── Headline ── */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="font-display text-[28px] sm:text-[36px] md:text-[48px] font-bold text-foreground leading-[1.1] tracking-tight"
          >
            Quel est votre problème?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md"
          >
            Décrivez. Prenez une photo. Parlez.
          </motion.p>

          {/* ── VOICE ORB ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.45, type: "spring", stiffness: 200 }}
            className="mt-10 mb-6 flex flex-col items-center"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer ring */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 140,
                  height: 140,
                  border: "2px solid hsl(222 100% 61% / 0.2)",
                  boxShadow: "0 0 40px hsl(222 100% 61% / 0.15), inset 0 0 40px hsl(222 100% 61% / 0.05)",
                }}
                animate={{ scale: voiceActive ? [1, 1.15, 1] : [1, 1.05, 1] }}
                transition={{ duration: voiceActive ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Pulse rings — listening */}
              {orbState === "listening" && [0, 1].map((i) => (
                <motion.div key={i} className="absolute rounded-full pointer-events-none"
                  style={{ width: 120, height: 120, border: "1.5px solid hsl(222 100% 70% / 0.2)" }}
                  animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                />
              ))}

              {/* Speaking wave */}
              {orbState === "speaking" && [0, 1].map((i) => (
                <motion.div key={`s${i}`} className="absolute rounded-full pointer-events-none"
                  style={{ width: 120, height: 120, border: "1.5px solid hsl(195 100% 60% / 0.25)" }}
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                />
              ))}

              {/* Thinking */}
              {orbState === "thinking" && (
                <motion.div className="absolute rounded-full pointer-events-none"
                  style={{ width: 130, height: 130, border: "2px dashed hsl(252 100% 70% / 0.2)" }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Main orb */}
              <motion.button
                onClick={() => voiceActive ? stopVoice() : startVoice()}
                className="relative rounded-full flex items-center justify-center overflow-hidden z-10"
                style={{
                  width: 100,
                  height: 100,
                  background: "linear-gradient(135deg, hsl(222 100% 30% / 0.8), hsl(222 100% 20% / 0.9))",
                  border: "2px solid hsl(222 100% 70% / 0.3)",
                  boxShadow: "0 0 60px -10px hsl(222 100% 61% / 0.4), inset 0 1px 1px hsl(0 0% 100% / 0.1)",
                }}
                animate={
                  orbState === "speaking" ? { scale: [1, 1.08, 1] }
                    : orbState === "listening" ? { scale: [1, 1.05, 1] }
                    : { scale: [1, 1.02, 1] }
                }
                transition={{
                  duration: orbState === "speaking" ? 0.6 : orbState === "listening" ? 1.2 : 3,
                  repeat: Infinity, ease: "easeInOut",
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Inner glow */}
                <div className="absolute inset-0 rounded-full" style={{
                  background: "radial-gradient(circle at 40% 35%, hsl(222 100% 70% / 0.25), transparent 60%)",
                }} />

                {/* Icon */}
                {orbState === "speaking" ? (
                  <Volume2 className="h-9 w-9 text-white/90 relative z-10 drop-shadow-sm" />
                ) : orbState === "thinking" ? (
                  <Loader2 className="h-9 w-9 text-white/90 relative z-10 animate-spin" />
                ) : (
                  <Mic className="h-9 w-9 text-white/90 relative z-10 drop-shadow-sm" />
                )}
              </motion.button>
            </div>

            {/* Status */}
            <AnimatePresence mode="wait">
              <motion.p
                key={voiceActive ? orbState : "idle"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 text-xs font-medium text-white/50"
              >
                {statusText}
              </motion.p>
            </AnimatePresence>

            {/* Voice controls */}
            <AnimatePresence>
              {voiceActive && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-3 flex items-center gap-2"
                >
                  {orbState === "speaking" && (
                    <button onClick={muteSpeech}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <VolumeX className="h-3 w-3" /> Couper
                    </button>
                  )}
                  <button onClick={() => { stopVoice(); setTextSheetOpen(true); }}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <Keyboard className="h-3 w-3" /> Écrire
                  </button>
                  <button onClick={stopVoice}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-red-400/80 bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors"
                  >
                    <Square className="h-2.5 w-2.5" /> Arrêter
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Quick Actions ── */}
          <AnimatePresence>
            {!voiceActive && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, delay: 0.55 }}
                className="flex flex-wrap justify-center gap-2.5 w-full"
              >
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.label}
                    to={action.route}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium text-white/80 transition-all hover:text-white hover:bg-white/10 active:scale-[0.97]"
                    style={{
                      background: "hsl(222 30% 15% / 0.6)",
                      border: "1px solid hsl(222 40% 30% / 0.4)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <action.icon className="h-4 w-4 text-primary/80" />
                    {action.label}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-20" />
      </section>

      <AlexAssistantSheet
        open={textSheetOpen}
        onClose={() => { setTextSheetOpen(false); setTextSheetChip(undefined); }}
        initialChip={textSheetChip}
      />
    </>
  );
}
