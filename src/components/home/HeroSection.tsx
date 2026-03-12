/**
 * HeroSection — Premium mobile-first UNPRO hero with AlexOrb as primary CTA,
 * stable rotating headline, and search card as secondary action.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroHouse from "@/assets/hero-house.jpg";
import unproRobot from "@/assets/unpro-robot.png";
import { ArrowRight } from "lucide-react";
import AlexOrb from "@/components/alex/AlexOrb";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";

const ROTATING_ITEMS = [
  { article: "le", profession: "couvreur", action: "votre toiture" },
  { article: "le", profession: "designer", action: "votre cuisine" },
  { article: "l'", profession: "électricien", action: "votre boîte électrique" },
  { article: "l'", profession: "arpenteur-géomètre", action: "votre certificat" },
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

const popularTags = [
  { icon: "🏡", label: "Rénovation", color: "text-primary" },
  { icon: "🏗️", label: "Construction", color: "text-[hsl(45_90%_45%)]" },
  { icon: "📐", label: "Agrandissement", color: "text-[hsl(160_55%_40%)]" },
];

/* ─── Helper bubble messages ─── */
const HELPER_BUBBLES = [
  "Décrivez votre projet",
  "Je peux vous aider",
  "Trouvez le bon pro",
];

export default function HeroSection() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [index, setIndex] = useState(0);
  const [alexOpen, setAlexOpen] = useState(false);
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_ITEMS.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, []);

  // Helper bubble cycle
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

  return (
    <>
      <section
        className="relative overflow-hidden pb-8"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(210 80% 93%) 58%, hsl(210 80% 91%) 100%)",
        }}
      >
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full bg-background/35 blur-3xl" />
          <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-8 md:px-10 md:pt-12">
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.08fr)_420px]">
            {/* Left column */}
            <div className="min-w-0">
              {/* Fixed-height title container */}
              <div className="min-h-[220px] sm:min-h-[260px] md:min-h-[320px]">
                <h1 className="max-w-[680px] text-[2.6rem] font-extrabold leading-[0.95] tracking-[-0.05em] text-foreground sm:text-[3.25rem] md:text-[4.25rem]">
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
                        <span className="text-foreground">{current.article} </span>
                        <span className="text-primary [text-shadow:0_0_18px_hsl(var(--primary)/0.16)]">
                          {current.profession}
                        </span>
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="mt-1 block text-foreground">idéal pour</span>
                  <span className="mt-1 block min-h-[2.2em] max-w-[13ch] text-[hsl(225_70%_55%)]">
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
              <p className="max-w-[420px] text-lg leading-8 text-muted-foreground md:text-xl md:leading-10">
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
                          color: "hsl(222 47% 11%)",
                          boxShadow: "0 4px 16px hsl(220 30% 20% / 0.1)",
                          border: "1px solid hsl(220 16% 92%)",
                        }}
                      >
                        {greetingBubble}
                        {/* Arrow */}
                        <div
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45"
                          style={{ background: "white", borderRight: "1px solid hsl(220 16% 92%)", borderBottom: "1px solid hsl(220 16% 92%)" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AlexOrb size="lg" onClick={() => setAlexOpen(true)} />
                </div>

                <p className="mt-4 text-sm font-bold" style={{ color: "hsl(222 47% 11%)" }}>
                  Parlez à Alex
                </p>
                <p className="text-xs" style={{ color: "hsl(220 12% 50%)" }}>
                  Voix ou texte
                </p>
              </div>

              {/* ═══ Search card — Secondary ═══ */}
              <div
                className="mt-6 max-w-[650px] rounded-[24px] p-4"
                style={{
                  background: "hsl(0 0% 100% / 0.88)",
                  border: "1px solid hsl(220 25% 92%)",
                  boxShadow: "0 8px 24px hsl(220 30% 30% / 0.06)",
                }}
              >
                <p className="mb-3 text-sm font-bold" style={{ color: "hsl(222 47% 11%)" }}>
                  ou recherchez directement
                </p>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-11 flex-1 items-center rounded-full px-4 text-xs"
                    style={{
                      background: "hsl(220 16% 97%)",
                      border: "1px solid hsl(220 16% 92%)",
                      color: "hsl(220 12% 50%)",
                    }}
                  >
                    <span className="mr-2">🏠</span>
                    <span className="truncate">Ex: Rénovation, cuisine, toiture…</span>
                  </div>
                  <button
                    onClick={() => navigate(isAuthenticated ? "/describe-project" : "/signup")}
                    className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-white"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(195 100% 55%))",
                      boxShadow: "0 6px 16px hsl(195 100% 50% / 0.25)",
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Popular chips */}
              <div className="mt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Populaire
                </p>
                <div className="flex flex-wrap gap-3">
                  {popularTags.map((tag) => (
                    <span
                      key={tag.label}
                      className={`rounded-full bg-card px-5 py-3 text-base font-semibold shadow-sm ring-1 ring-border/20 ${tag.color}`}
                    >
                      {tag.icon} {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: image + robot */}
            <div className="relative mx-auto w-full max-w-[280px] md:max-w-[420px]">
              <div
                className="overflow-hidden rounded-[28px] bg-card/75 shadow-[0_22px_64px_rgba(34,72,145,0.18)] ring-1 ring-border/30 backdrop-blur-xl md:rounded-[32px]"
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
            <path d="M0 80C200 40 400 100 600 70C800 40 1000 90 1200 60C1350 45 1440 70 1440 60V120H0V80Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* Alex Assistant Sheet */}
      <AlexAssistantSheet open={alexOpen} onClose={() => setAlexOpen(false)} />
    </>
  );
}
