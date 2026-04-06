/**
 * HeroSectionCinematicAlex — Immersive cinematic hero with Alex orb,
 * intent selector pills, and UNPRO brand glow.
 * 
 * UNIFIED: Uses openAlex() exclusively — NO independent voice pipeline.
 * The orb is visual-only; actual voice is handled by GlobalAlexOverlay.
 */
import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { Mic, Volume2, Loader2, Keyboard, AlertTriangle, Sparkles, MessageSquare, ArrowRight, Camera, FileSearch } from "lucide-react";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";

const cinematicBg = "/images/hero-bg.gif";

type IntentSlug = "probleme" | "projet" | "avis";

const INTENTS = [
  {
    slug: "probleme" as IntentSlug,
    label: "Problème",
    icon: AlertTriangle,
    cta: "Détecter un problème",
    ctaIcon: Camera,
    route: "/describe-project?intent=problem",
  },
  {
    slug: "projet" as IntentSlug,
    label: "Projet",
    icon: Sparkles,
    cta: "Décrire mon projet",
    ctaIcon: Camera,
    route: "/describe-project",
  },
  {
    slug: "avis" as IntentSlug,
    label: "Avis",
    icon: MessageSquare,
    cta: "Analyser 3 soumissions",
    ctaIcon: FileSearch,
    route: "/describe-project?intent=quote-analysis",
  },
];

export default function HeroSection() {
  const { user } = useAuth();
  const { openAlex, isOpen: alexOpen, voiceActive } = useAlexVoice();
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [activeIntent, setActiveIntent] = useState<IntentSlug>("probleme");

  const current = INTENTS.find((i) => i.slug === activeIntent)!;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map voice overlay state to orb visual state
  const orbState = alexOpen && voiceActive ? "speaking" : alexOpen ? "listening" : "idle";

  const handleOrbClick = useCallback(() => {
    if (alexOpen) return; // Already open, don't duplicate
    openAlex(activeIntent);
  }, [openAlex, activeIntent, alexOpen]);

  const handleCtaClick = useCallback(() => {
    if (alexOpen) return;
    openAlex(activeIntent);
    // Auto-open file upload after greeting (~4s)
    if (activeIntent === "avis" || activeIntent === "probleme" || activeIntent === "projet") {
      setTimeout(() => fileInputRef.current?.click(), 4000);
    }
  }, [openAlex, activeIntent, alexOpen]);

  const statusText =
    orbState === "speaking" ? "Alex vous parle…"
    : orbState === "listening" ? "Je vous écoute…"
    : "Parlez à Alex";

  return (
    <>
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center overflow-hidden">
        {/* ── Cinematic Background ── */}
        <motion.div
          className="absolute inset-0 z-0"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          <img src={cinematicBg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
        </motion.div>

        {/* ── Deep cinematic overlay ── */}
        <div className="absolute inset-0 z-[1]" style={{
          background: "linear-gradient(to bottom, rgba(4,8,20,0.55) 0%, rgba(4,8,20,0.72) 40%, rgba(4,8,20,0.94) 100%)",
        }} />

        {/* ── Dynamic aura glow ── */}
        <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px]"
            animate={{ opacity: [0.12, 0.2, 0.12], scale: [1, 1.05, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: "radial-gradient(ellipse, hsl(222 100% 60% / 0.2) 0%, transparent 70%)" }}
          />
          <motion.div
            className="absolute top-[52%] left-0 right-0 h-[1px]"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent 5%, hsl(222 100% 70% / 0.35) 30%, hsl(195 100% 60% / 0.5) 50%, hsl(222 100% 70% / 0.35) 70%, transparent 95%)",
              filter: "blur(1px)",
            }}
          />
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto w-full px-5 pt-6 pb-20">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="font-display text-[28px] sm:text-[38px] md:text-[48px] font-bold text-white leading-[1.1] tracking-tight">
              Passez à{" "}
              <span className="bg-gradient-to-r from-[hsl(222,100%,70%)] via-[hsl(195,100%,60%)] to-[hsl(252,100%,72%)] bg-clip-text text-transparent">
                l'intelligence
              </span>
              <br />du bâtiment
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/55 max-w-md mx-auto leading-relaxed">
              Photo, voix ou texte — trouvez le bon professionnel en quelques secondes.
            </p>
          </motion.div>

          {/* ── Intent Pills ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-8 flex items-center gap-2"
          >
            {INTENTS.map((intent) => {
              const isAct = intent.slug === activeIntent;
              return (
                <motion.button
                  key={intent.slug}
                  onClick={() => setActiveIntent(intent.slug)}
                  className="relative flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-250"
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: isAct
                      ? "linear-gradient(135deg, hsl(222 100% 50% / 0.9), hsl(222 100% 35% / 0.95))"
                      : "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(16px)",
                    border: isAct ? "1px solid hsl(222 100% 70% / 0.45)" : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: isAct ? "0 0 30px hsl(222 100% 60% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.1)" : "none",
                    color: isAct ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <intent.icon className="h-3.5 w-3.5" />
                  {intent.label}
                </motion.button>
              );
            })}
          </motion.div>

          {/* ── Cinematic Voice Orb — Visual only, triggers openAlex() ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.55, type: "spring", stiffness: 180 }}
            className="mt-10 mb-5 flex flex-col items-center"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer breathing glow */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 150, height: 150,
                  background: "radial-gradient(circle, hsl(222 100% 60% / 0.12) 0%, transparent 70%)",
                }}
                animate={{ scale: alexOpen ? [1, 1.2, 1] : [1, 1.08, 1], opacity: alexOpen ? [0.4, 0.8, 0.4] : [0.3, 0.5, 0.3] }}
                transition={{ duration: alexOpen ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Ring */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 130, height: 130,
                  border: "1.5px solid hsl(222 100% 65% / 0.2)",
                  boxShadow: "0 0 40px hsl(222 100% 65% / 0.1)",
                }}
                animate={{ scale: alexOpen ? [1, 1.12, 1] : [1, 1.04, 1] }}
                transition={{ duration: alexOpen ? 1.2 : 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Listening pulses */}
              {orbState === "listening" && [0, 1].map((i) => (
                <motion.div key={i} className="absolute rounded-full pointer-events-none"
                  style={{ width: 120, height: 120, border: "1.5px solid hsl(222 100% 70% / 0.2)" }}
                  animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                />
              ))}

              {/* Speaking waves */}
              {orbState === "speaking" && [0, 1].map((i) => (
                <motion.div key={`s${i}`} className="absolute rounded-full pointer-events-none"
                  style={{ width: 120, height: 120, border: "1.5px solid hsl(195 100% 60% / 0.25)" }}
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                />
              ))}

              {/* Main orb */}
              <motion.button
                onClick={handleOrbClick}
                className="relative rounded-full flex items-center justify-center overflow-hidden z-10"
                data-testid="alex-hero-orb"
                style={{
                  width: 96, height: 96,
                  background: "linear-gradient(135deg, hsl(222 100% 45% / 0.9), hsl(222 100% 25% / 0.95))",
                  border: "2px solid hsl(222 100% 70% / 0.3)",
                  boxShadow: "0 0 60px -10px hsl(222 100% 65% / 0.5), 0 0 100px -20px hsl(222 100% 55% / 0.3), inset 0 1px 1px hsl(0 0% 100% / 0.1)",
                }}
                animate={
                  orbState === "speaking" ? { scale: [1, 1.08, 1] }
                  : orbState === "listening" ? { scale: [1, 1.05, 1] }
                  : { scale: [1, 1.03, 1] }
                }
                transition={{ duration: orbState === "speaking" ? 0.6 : orbState === "listening" ? 1.2 : 2.5, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.1, boxShadow: "0 0 80px -10px hsl(222 100% 65% / 0.6)" }}
                whileTap={{ scale: 0.92 }}
              >
                <div className="absolute inset-0 rounded-full" style={{
                  background: "radial-gradient(circle at 38% 32%, hsl(222 100% 75% / 0.35), transparent 60%)",
                }} />
                {orbState === "speaking" ? (
                  <Volume2 className="h-9 w-9 text-white/90 relative z-10" />
                ) : orbState === "listening" ? (
                  <Loader2 className="h-9 w-9 text-white/90 relative z-10 animate-spin" />
                ) : (
                  <Mic className="h-9 w-9 text-white/90 relative z-10" />
                )}
              </motion.button>
            </div>

            {/* Status */}
            <AnimatePresence mode="wait">
              <motion.p
                key={orbState}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 text-xs font-medium text-white/45"
              >
                {statusText}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* ── Context CTA ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIntent}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-2.5 w-full max-w-sm"
            >
              <button
                onClick={handleCtaClick}
                className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, hsl(222 100% 55%), hsl(222 100% 42%))",
                  boxShadow: "0 4px 24px hsl(222 100% 55% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
                  color: "#fff",
                }}
              >
                <current.ctaIcon className="h-4 w-4" />
                {current.cta}
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              console.log("[Hero] Files selected:", files.length);
            }
            e.target.value = "";
          }}
        />

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 z-20 pointer-events-none" style={{
          background: "linear-gradient(to top, hsl(228 40% 7%) 0%, transparent 100%)",
        }} />
      </section>

      <AlexAssistantSheet open={textSheetOpen} onClose={() => setTextSheetOpen(false)} />
    </>
  );
}
