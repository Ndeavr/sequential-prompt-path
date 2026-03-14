/**
 * HeroSection — AI-first hero with inline voice conversation on the orb.
 * Uses useAlexVoiceSession for stable, premium voice experience.
 * Clicking the orb starts voice mode in-place (no sheet).
 * Text mode opens the AlexAssistantSheet.
 */
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAlexVoiceSession } from "@/hooks/useAlexVoiceSession";
import { useLocation } from "react-router-dom";
import { Mic, Volume2, VolumeX, Loader2, Keyboard, Square } from "lucide-react";
import heroAgrandissement from "@/assets/hero-agrandissement.jpg";
import heroArpenteur from "@/assets/hero-arpenteur.jpg";
import heroToiture from "@/assets/hero-toiture.jpg";
import heroElectricien from "@/assets/hero-electricien.jpg";
import heroPlomberie from "@/assets/hero-plomberie.jpg";
import heroIsolation from "@/assets/hero-isolation.jpg";
import unproRobot from "@/assets/unpro-robot.png";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";

const ROTATING_ITEMS = [
  { label: "le contracteur", action: "agrandir votre maison", image: heroAgrandissement },
  { label: "l'arpenteur", action: "un certificat de localisation", image: heroArpenteur },
  { label: "le couvreur", action: "refaire votre toiture", image: heroToiture },
  { label: "l'électricien", action: "remplacer votre panneau électrique", image: heroElectricien },
  { label: "le plombier", action: "rénover votre salle de bain", image: heroPlomberie },
  { label: "l'entrepreneur", action: "isoler votre grenier", image: heroIsolation },
];

const textVariants = {
  enter: { opacity: 0, y: 8, filter: "blur(8px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(8px)" },
};

const ALL_SEARCHES = [
  { icon: "🏠", label: "Rénovation" },
  { icon: "🏗️", label: "Construction" },
  { icon: "📐", label: "Agrandissement" },
  { icon: "🏡", label: "Toiture" },
  { icon: "🍳", label: "Cuisine" },
  { icon: "🔌", label: "Électricité" },
  { icon: "🚿", label: "Plomberie" },
  { icon: "🧱", label: "Maçonnerie" },
  { icon: "🪟", label: "Fenêtres" },
  { icon: "🌡️", label: "Isolation" },
  { icon: "🏢", label: "Condo" },
  { icon: "🔧", label: "Entretien" },
  { icon: "🎨", label: "Peinture" },
  { icon: "🌿", label: "Aménagement" },
  { icon: "🛠️", label: "Réparation" },
  { icon: "💡", label: "Éclairage" },
  { icon: "🚪", label: "Portes" },
  { icon: "🧰", label: "Dépannage" },
  { icon: "♻️", label: "Démolition" },
  { icon: "📦", label: "Déménagement" },
  { icon: "🏗️", label: "Fondation" },
  { icon: "🔥", label: "Chauffage" },
  { icon: "❄️", label: "Climatisation" },
  { icon: "🛁", label: "Salle de bain" },
  { icon: "🏡", label: "Revêtement" },
];

const POPULAR_CHIPS = ALL_SEARCHES.slice(0, 6);

const CHIP_GREETINGS: Record<string, string> = {
  "Rénovation": "vous cherchez à rénover ?",
  "Construction": "vous cherchez à construire ?",
  "Agrandissement": "vous pensez agrandir votre maison ?",
  "Toiture": "vous avez un projet de toiture ?",
  "Cuisine": "vous voulez refaire votre cuisine ?",
  "Électricité": "vous avez besoin d'un électricien ?",
  "Plomberie": "vous cherchez un plombier ?",
};

export default function HeroSection() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);

  // Text sheet state
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [textSheetChip, setTextSheetChip] = useState<string | undefined>();

  // Voice session
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

  // Rotating hero text
  useEffect(() => {
    const interval = window.setInterval(() => setIndex((p) => (p + 1) % ROTATING_ITEMS.length), 6500);
    return () => window.clearInterval(interval);
  }, []);

  // Start voice mode
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

  // Stop voice mode
  const stopVoice = useCallback(() => {
    closeSession();
  }, [closeSession]);

  const current = useMemo(() => ROTATING_ITEMS[index], [index]);

  const clampStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  };

  // Status text
  const statusText =
    orbState === "speaking" ? "Alex vous parle…"
      : orbState === "thinking" ? "Alex réfléchit…"
      : orbState === "listening" ? "Je vous écoute…"
      : "Parlez à Alex";

  const statusSub =
    orbState === "idle" && !voiceActive ? "Décrivez votre projet en 30 secondes" : "";

  return (
    <>
      <section
        className="relative overflow-hidden pb-8"
        style={{ background: "linear-gradient(180deg, #F7FBFF 0%, #EAF4FF 58%, #DCEEFF 100%)" }}
      >
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full blur-3xl" style={{ background: "hsl(210 60% 92% / 0.6)" }} />
          <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full blur-3xl" style={{ background: "hsl(222 100% 61% / 0.1)" }} />
          <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full blur-2xl" style={{ background: "hsl(195 80% 70% / 0.12)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-8 md:px-10 md:pt-12">
          <div className="relative md:grid md:grid-cols-[minmax(0,1.08fr)_420px] md:gap-8 md:items-start">
            {/* Mobile background image */}
            <div className="absolute top-0 right-0 w-[55%] h-[260px] md:hidden pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.img key={current.image} src={current.image} alt={current.action}
                  className="w-full h-full object-cover rounded-[20px]" loading="eager"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                />
              </AnimatePresence>
              <div className="absolute inset-0 rounded-[20px]"
                style={{ background: "linear-gradient(to right, hsl(213 60% 97%) 0%, transparent 40%), linear-gradient(to top, hsl(213 60% 97%) 0%, transparent 50%)" }}
              />
              <motion.img src={unproRobot} alt="Alex UNPRO"
                className="absolute -right-2 -bottom-6 w-[84px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Left column */}
            <div className="relative z-10 min-w-0">
              <h1 className="max-w-[680px] text-[40px] font-extrabold leading-[1.1] tracking-[-0.04em] sm:text-[50px] md:text-[64px]" style={{ color: "#0B1533" }}>
                <span>Trouvez</span>
                <div className="overflow-hidden" style={{ height: "1.15em" }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={current.label} variants={textVariants}
                      initial="enter" animate="center" exit="exit"
                      transition={{ duration: 0.38, ease: "easeOut" }}
                      style={{ ...clampStyle, color: "#3F7BFF" }}
                    >
                      {current.label}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <span style={{ color: "#0B1533" }}>idéal pour</span>
                <div className="overflow-hidden" style={{ height: "2.2em" }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={current.action} variants={textVariants}
                      initial="enter" animate="center" exit="exit"
                      transition={{ duration: 0.38, ease: "easeOut", delay: 0.42 }}
                      style={{ ...clampStyle, color: "#3F7BFF" }}
                    >
                      {current.action}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </h1>

              <p className="max-w-[420px] text-lg leading-8 md:text-xl md:leading-10" style={{ color: "#6C7A92" }}>
                Comparez, évaluez et choisissez en toute confiance.
              </p>

              {/* ═══ INLINE ANIMATED ORB ═══ */}
              <div className="mt-8 flex flex-col items-center md:items-start">
                <div className="relative flex items-center justify-center">
                  {/* Outer halo */}
                  <motion.div className="absolute rounded-full pointer-events-none"
                    style={{
                      width: voiceActive ? 180 : 150,
                      height: voiceActive ? 180 : 150,
                      background: "conic-gradient(from 0deg, hsl(222 100% 61% / 0.1), hsl(195 100% 50% / 0.15), hsl(252 100% 65% / 0.1), hsl(222 100% 61% / 0.1))",
                    }}
                    animate={{ rotate: 360, scale: voiceActive ? 1 : 0.85 }}
                    transition={{ rotate: { duration: orbState === "thinking" ? 3 : 12, repeat: Infinity, ease: "linear" }, scale: { duration: 0.4 } }}
                  />

                  {/* Breathing glow */}
                  <motion.div className="absolute rounded-full pointer-events-none"
                    style={{
                      width: voiceActive ? 160 : 130,
                      height: voiceActive ? 160 : 130,
                      background: "radial-gradient(circle, hsl(222 100% 61% / 0.18) 0%, hsl(252 100% 65% / 0.06) 50%, transparent 70%)",
                    }}
                    animate={{
                      scale: orbState === "speaking" ? [1, 1.35, 1] : orbState === "listening" ? [1, 1.2, 1] : [1, 1.1, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: orbState === "speaking" ? 0.7 : orbState === "listening" ? 1.5 : 3,
                      repeat: Infinity, ease: "easeInOut",
                    }}
                  />

                  {/* Pulse rings — listening */}
                  {orbState === "listening" && [0, 1, 2].map((i) => (
                    <motion.div key={i} className="absolute rounded-full pointer-events-none"
                      style={{ width: 112, height: 112, border: "2px solid hsl(222 100% 61% / 0.15)" }}
                      animate={{ scale: [1, 1.6 + i * 0.25], opacity: [0.6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                    />
                  ))}

                  {/* Speaking wave rings */}
                  {orbState === "speaking" && [0, 1, 2].map((i) => (
                    <motion.div key={`s${i}`} className="absolute rounded-full pointer-events-none"
                      style={{ width: 112, height: 112, border: "2px solid hsl(195 100% 50% / 0.2)" }}
                      animate={{ scale: [1, 1.5 + i * 0.2], opacity: [0.7, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
                    />
                  ))}

                  {/* Thinking dashed ring */}
                  {orbState === "thinking" && (
                    <motion.div className="absolute rounded-full pointer-events-none"
                      style={{ width: 125, height: 125, border: "2px dashed hsl(252 100% 65% / 0.25)" }}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                  )}

                  {/* Main orb button */}
                  <motion.button
                    onClick={() => voiceActive ? stopVoice() : startVoice()}
                    className="relative rounded-full flex items-center justify-center overflow-hidden z-10"
                    style={{
                      width: voiceActive ? 112 : 100,
                      height: voiceActive ? 112 : 100,
                      boxShadow: "0 12px 40px -8px hsl(222 100% 61% / 0.4), 0 0 24px -4px hsl(195 100% 50% / 0.25), inset 0 1px 2px hsl(0 0% 100% / 0.3)",
                    }}
                    animate={
                      orbState === "speaking" ? { scale: [1, 1.08, 1] }
                        : orbState === "listening" ? { scale: [1, 1.06, 1] }
                        : orbState === "thinking" ? { scale: [1, 1.04, 1] }
                        : { scale: [1, 1.03, 1] }
                    }
                    transition={{
                      duration: orbState === "speaking" ? 0.6 : orbState === "listening" ? 1.2 : orbState === "thinking" ? 1.5 : 3.5,
                      repeat: Infinity, ease: "easeInOut",
                    }}
                    whileHover={!voiceActive ? { scale: 1.08 } : undefined}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Gradient bg */}
                    <motion.div className="absolute inset-0"
                      animate={{
                        background: orbState === "speaking"
                          ? ["linear-gradient(135deg, hsl(195 100% 50%), hsl(252 100% 65%), hsl(222 100% 61%))",
                             "linear-gradient(225deg, hsl(222 100% 61%), hsl(195 100% 55%), hsl(252 100% 70%))",
                             "linear-gradient(135deg, hsl(195 100% 50%), hsl(252 100% 65%), hsl(222 100% 61%))"]
                          : ["linear-gradient(135deg, hsl(222 100% 61%), hsl(252 100% 65%), hsl(195 100% 50%))",
                             "linear-gradient(225deg, hsl(252 100% 65%), hsl(195 100% 55%), hsl(222 100% 65%))",
                             "linear-gradient(315deg, hsl(195 100% 50%), hsl(222 100% 61%), hsl(252 100% 70%))",
                             "linear-gradient(135deg, hsl(222 100% 61%), hsl(252 100% 65%), hsl(195 100% 50%))"],
                      }}
                      transition={{ duration: orbState === "speaking" ? 3 : 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* Specular */}
                    <div className="absolute inset-0 rounded-full"
                      style={{ background: "radial-gradient(ellipse 60% 50% at 35% 25%, hsl(0 0% 100% / 0.3), transparent 60%)" }}
                    />
                    {/* Shine sweep */}
                    <motion.div className="absolute inset-0"
                      style={{ background: "linear-gradient(120deg, transparent 30%, hsl(0 0% 100% / 0.18) 50%, transparent 70%)" }}
                      animate={{ x: ["-120%", "120%"] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
                    />
                    {/* Icon */}
                    {orbState === "speaking" ? (
                      <Volume2 className="h-10 w-10 text-white relative z-10 drop-shadow-sm" />
                    ) : orbState === "thinking" ? (
                      <Loader2 className="h-10 w-10 text-white relative z-10 drop-shadow-sm animate-spin" />
                    ) : voiceActive ? (
                      <Mic className="h-10 w-10 text-white relative z-10 drop-shadow-sm" />
                    ) : (
                      <motion.svg viewBox="0 0 24 24" className="h-10 w-10 relative z-10 drop-shadow-sm" fill="none" stroke="white" strokeWidth="1.5">
                        <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                      </motion.svg>
                    )}
                  </motion.button>
                </div>

                {/* Status text */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={voiceActive ? orbState : "idle"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="mt-4 text-center md:text-left"
                  >
                    <p className="text-sm font-bold" style={{ color: "#0B1533" }}>
                      {statusText}
                    </p>
                    {statusSub && (
                      <p className="text-xs" style={{ color: "#6C7A92" }}>{statusSub}</p>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Voice active controls */}
                <AnimatePresence>
                  {voiceActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 flex items-center gap-3"
                    >
                      {orbState === "speaking" && (
                        <button onClick={muteSpeech}
                          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.03]"
                          style={{ color: "#6C7A92", background: "rgba(63,123,255,0.04)", border: "1px solid #E7EEF8" }}
                        >
                          <VolumeX className="h-3.5 w-3.5" /> Couper
                        </button>
                      )}
                      <button onClick={() => { stopVoice(); setTextSheetOpen(true); }}
                        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.03]"
                        style={{ color: "#6C7A92", background: "rgba(63,123,255,0.04)", border: "1px solid #E7EEF8" }}
                      >
                        <Keyboard className="h-3.5 w-3.5" /> Écrire
                      </button>
                      <button onClick={stopVoice}
                        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.03]"
                        style={{ color: "#EF4444", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}
                      >
                        <Square className="h-3 w-3" /> Arrêter
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Popular chips — hide when voice is active */}
              <AnimatePresence>
                {!voiceActive && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-7"
                  >
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-center md:text-left" style={{ color: "#6C7A92" }}>
                      Populaire
                    </p>
                    <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
                      {POPULAR_CHIPS.map((chip) => (
                        <button key={chip.label} onClick={() => startVoice(chip.label)}
                          className="rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
                          style={{ background: "white", color: "#0B1533", border: "1px solid #E7EEF8", boxShadow: "0 4px 12px rgba(83,118,180,0.06)" }}
                        >
                          {chip.icon} {chip.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right column: desktop image */}
            <div className="relative hidden md:block w-full">
              <div className="relative overflow-hidden rounded-[32px]" style={{ border: "1px solid #DFE9F5" }}>
                <AnimatePresence mode="wait">
                  <motion.img key={current.image} src={current.image} alt={current.action}
                    className="aspect-square w-full object-cover" loading="eager"
                    initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(to bottom, transparent 50%, hsl(213 60% 97%) 100%)" }}
                />
              </div>
              <img src={unproRobot} alt="Alex UNPRO"
                className="absolute -right-4 -bottom-7 w-[112px] drop-shadow-[0_12px_20px_rgba(0,0,0,0.18)]"
              />
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="pointer-events-none absolute -bottom-[2px] left-0 right-0 z-[2]">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-full" preserveAspectRatio="none">
            <path d="M0 80C200 40 400 100 600 70C800 40 1000 90 1200 60C1350 45 1440 70 1440 60V120H0V80Z" fill="#F0F4FA" />
          </svg>
        </div>
      </section>

      {/* Text-only sheet */}
      <AlexAssistantSheet
        open={textSheetOpen}
        onClose={() => { setTextSheetOpen(false); setTextSheetChip(undefined); }}
        initialChip={textSheetChip}
      />
    </>
  );
}
