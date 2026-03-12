/**
 * HeroSection — AI-first hero with AlexOrb as the sole primary CTA.
 * No search bar. Popular chips launch Alex with context.
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import heroHouse from "@/assets/hero-house.jpg";
import unproRobot from "@/assets/unpro-robot.png";
import AlexOrb from "@/components/alex/AlexOrb";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";

const ROTATING_ITEMS = [
  { article: "le", profession: "couvreur", action: "votre toiture" },
  { article: "le", profession: "designer", action: "votre cuisine" },
  { article: "l'", profession: "électricien", action: "votre panneau" },
  { article: "l'", profession: "arpenteur", action: "votre certificat" },
  { article: "le", profession: "paysagiste", action: "votre terrain" },
  { article: "le", profession: "plombier", action: "votre salle de bain" },
  { article: "le", profession: "maçon", action: "votre fondation" },
  { article: "le", profession: "notaire", action: "votre transaction" },
  { article: "le", profession: "contracteur", action: "votre agrandissement" },
  { article: "l'", profession: "isoleur", action: "votre grenier" },
];

const textVariants = {
  enter: { opacity: 0, y: 10, filter: "blur(8px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(8px)" },
};

const POPULAR_CHIPS = [
  { icon: "🏠", label: "Rénovation" },
  { icon: "🏗️", label: "Construction" },
  { icon: "📐", label: "Agrandissement" },
  { icon: "🏡", label: "Toiture" },
  { icon: "🍳", label: "Cuisine" },
];

const HELPER_BUBBLES = [
  "Décrivez votre projet",
  "Je peux vous aider",
  "Trouvez le bon pro",
];

export default function HeroSection() {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [alexOpen, setAlexOpen] = useState(false);
  const [alexInitialMessage, setAlexInitialMessage] = useState<string | undefined>();
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_ITEMS.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const show = () => {
      setShowBubble(true);
      setTimeout(() => setShowBubble(false), 3000);
    };
    const timeout = setTimeout(show, 2500);
    const interval = setInterval(() => {
      setBubbleIndex((p) => (p + 1) % HELPER_BUBBLES.length);
      show();
    }, 8000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  const current = useMemo(() => ROTATING_ITEMS[index], [index]);

  const greetingBubble = firstName
    ? `Bonjour ${firstName} !`
    : HELPER_BUBBLES[bubbleIndex];

  const openAlex = (chipLabel?: string) => {
    if (chipLabel) {
      setAlexInitialMessage(chipLabel);
    } else {
      setAlexInitialMessage(undefined);
    }
    setAlexOpen(true);
  };

  return (
    <>
      <section
        className="relative overflow-hidden pb-8"
        style={{
          background: "linear-gradient(180deg, #F7FBFF 0%, #EAF4FF 58%, #DCEEFF 100%)",
        }}
      >
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full blur-3xl" style={{ background: "hsl(210 60% 92% / 0.6)" }} />
          <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full blur-3xl" style={{ background: "hsl(222 100% 61% / 0.1)" }} />
          <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full blur-2xl" style={{ background: "hsl(195 80% 70% / 0.12)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-8 md:px-10 md:pt-12">
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.08fr)_420px]">
            {/* Left column */}
            <div className="min-w-0">
              {/* Fixed-height title container */}
              <div className="min-h-[200px] sm:min-h-[240px] md:min-h-[300px]">
                <h1 className="max-w-[680px] text-[2.6rem] font-extrabold leading-[0.95] tracking-[-0.05em] sm:text-[3.25rem] md:text-[4.25rem]" style={{ color: "#0B1533" }}>
                  <span className="block">Trouvez</span>
                  <span className="mt-1 block min-h-[1.15em]">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`p-${index}`}
                        variants={textVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="inline-block"
                      >
                        <span style={{ color: "#0B1533" }}>{current.article} </span>
                        <span style={{ color: "#3F7BFF", textShadow: "0 0 18px rgba(63,123,255,0.16)" }}>
                          {current.profession}
                        </span>
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="mt-1 block" style={{ color: "#0B1533" }}>idéal pour</span>
                  <span className="mt-1 block min-h-[2.2em] max-w-[13ch]" style={{ color: "#3F7BFF" }}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`a-${index}`}
                        variants={textVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.03 }}
                        className="inline-block"
                      >
                        {current.action}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </h1>
              </div>

              {/* Subtitle */}
              <p className="max-w-[420px] text-lg leading-8 md:text-xl md:leading-10" style={{ color: "#6C7A92" }}>
                Comparez, évaluez et choisissez en toute confiance.
              </p>

              {/* ═══ Alex Orb — Primary CTA ═══ */}
              <div className="mt-8 flex flex-col items-center md:items-start">
                <div className="relative">
                  {/* Helper bubble */}
                  <AnimatePresence>
                    {showBubble && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.35 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-medium"
                        style={{
                          background: "white",
                          color: "#0B1533",
                          boxShadow: "0 4px 16px rgba(83,118,180,0.1)",
                          border: "1px solid #DFE9F5",
                        }}
                      >
                        {greetingBubble}
                        <div
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45"
                          style={{ background: "white", borderRight: "1px solid #DFE9F5", borderBottom: "1px solid #DFE9F5" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AlexOrb size="lg" onClick={() => openAlex()} />
                </div>

                <p className="mt-4 text-sm font-bold" style={{ color: "#0B1533" }}>
                  Parlez à Alex
                </p>
                <p className="text-xs" style={{ color: "#6C7A92" }}>
                  Décrivez votre projet en 30 secondes
                </p>
              </div>

              {/* ═══ Popular chips ═══ */}
              <div className="mt-7">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "#6C7A92" }}>
                  Populaire
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {POPULAR_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => openAlex(chip.label)}
                      className="rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
                      style={{
                        background: "white",
                        color: "#0B1533",
                        border: "1px solid #E7EEF8",
                        boxShadow: "0 4px 12px rgba(83,118,180,0.06)",
                      }}
                    >
                      {chip.icon} {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: image + robot */}
            <div className="relative mx-auto w-full max-w-[280px] md:max-w-[420px]">
              <div
                className="overflow-hidden rounded-[28px] shadow-[0_22px_64px_rgba(34,72,145,0.18)] md:rounded-[32px]"
                style={{ background: "rgba(255,255,255,0.75)", border: "1px solid #DFE9F5" }}
              >
                <img
                  src={heroHouse}
                  alt="Maison moderne"
                  className="aspect-square w-full object-cover"
                  loading="eager"
                />
              </div>
              <img
                src={unproRobot}
                alt="Alex UNPRO"
                className="absolute -right-4 -bottom-7 w-[80px] drop-shadow-[0_22px_30px_rgba(0,0,0,0.20)] md:w-[112px]"
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

      {/* Alex Assistant Sheet */}
      <AlexAssistantSheet
        open={alexOpen}
        onClose={() => { setAlexOpen(false); setAlexInitialMessage(undefined); }}
        initialChip={alexInitialMessage}
      />
    </>
  );
}
