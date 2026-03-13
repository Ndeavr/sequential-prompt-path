/**
 * HeroSection — AI-first hero with AlexOrb as the sole primary CTA.
 * No search bar. Popular chips launch Alex with context.
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import heroAgrandissement from "@/assets/hero-agrandissement.jpg";
import heroArpenteur from "@/assets/hero-arpenteur.jpg";
import heroToiture from "@/assets/hero-toiture.jpg";
import heroElectricien from "@/assets/hero-electricien.jpg";
import heroPlomberie from "@/assets/hero-plomberie.jpg";
import heroIsolation from "@/assets/hero-isolation.jpg";
import unproRobot from "@/assets/unpro-robot.png";
import AlexOrb from "@/components/alex/AlexOrb";
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
    }, 4500);
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

  /* Line-clamp style for animated slots */
  const clampStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
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
          {/* Image behind text on mobile, side-by-side on desktop */}
          <div className="relative md:grid md:grid-cols-[minmax(0,1.08fr)_420px] md:gap-8 md:items-start">
            {/* Mobile background image */}
            <div className="absolute top-0 right-0 w-[55%] h-[260px] md:hidden pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.img
                  key={current.image}
                  src={current.image}
                  alt={current.action}
                  className="w-full h-full object-cover rounded-[20px]"
                  loading="eager"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                />
              </AnimatePresence>
              {/* Gradient fade left + bottom to blend with background */}
              <div
                className="absolute inset-0 rounded-[20px]"
                style={{
                  background: "linear-gradient(to right, hsl(213 60% 97%) 0%, transparent 40%), linear-gradient(to top, hsl(213 60% 97%) 0%, transparent 50%)",
                }}
              />
              <img
                src={unproRobot}
                alt="Alex UNPRO"
                className="absolute -right-1 -bottom-4 w-[56px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
              />
            </div>

            {/* Left column — text */}
            <div className="relative z-10 min-w-0">
              {/* ═══ FIXED-HEIGHT title container ═══ */}
              <h1 className="max-w-[680px] text-[40px] font-extrabold leading-[1.1] tracking-[-0.04em] sm:text-[50px] md:text-[64px]" style={{ color: "#0B1533" }}>
                <span>Trouvez</span>
                <div className="overflow-hidden" style={{ height: "1.15em" }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.label}
                      variants={textVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
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
                    <motion.div
                      key={current.action}
                      variants={textVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.38, ease: "easeOut", delay: 0.42 }}
                      style={{ ...clampStyle, color: "#3F7BFF" }}
                    >
                      {current.action}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </h1>

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
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-center md:text-left" style={{ color: "#6C7A92" }}>
                  Populaire
                </p>
                <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
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

            {/* Right column: image + robot — desktop only */}
            <div className="relative hidden md:block w-full">
              <div
                className="relative overflow-hidden rounded-[32px]"
                style={{ border: "1px solid #DFE9F5" }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={current.image}
                    src={current.image}
                    alt={current.action}
                    className="aspect-square w-full object-cover"
                    loading="eager"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                </AnimatePresence>
                {/* Gradient fade to background */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom, transparent 50%, hsl(213 60% 97%) 100%)",
                  }}
                />
              </div>
              <img
                src={unproRobot}
                alt="Alex UNPRO"
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

      {/* Alex Assistant Sheet */}
      <AlexAssistantSheet
        open={alexOpen}
        onClose={() => { setAlexOpen(false); setAlexInitialMessage(undefined); }}
        initialChip={alexInitialMessage}
      />
    </>
  );
}
