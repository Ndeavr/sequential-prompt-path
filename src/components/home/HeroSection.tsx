/**
 * HeroSection — Premium mobile-first UNPRO hero with rotating headline,
 * pressable CTA, and cinematic page transition.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroHouse from "@/assets/hero-house.jpg";
import unproRobot from "@/assets/unpro-robot.png";
import { ArrowRight } from "lucide-react";

const ROTATING_ITEMS = [
  { profession: "notaire", action: "votre transaction" },
  { profession: "designer", action: "votre cuisine" },
  { profession: "électricien", action: "changer la boîte de disjoncteurs" },
  { profession: "arpenteur-géomètre", action: "un certificat de localisation" },
  { profession: "paysagiste", action: "installer de la tourbe" },
  { profession: "couvreur", action: "refaire votre toiture" },
  { profession: "isoleur", action: "isoler votre grenier" },
  { profession: "plombier", action: "rénover votre salle de bain" },
  { profession: "maçon", action: "réparer votre fondation" },
  { profession: "contracteur", action: "agrandir votre maison" },
];

const textVariants = {
  enter: { opacity: 0, y: 8, filter: "blur(8px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(8px)" },
};

const popularTags = [
  { icon: "🏡", label: "Rénovation", color: "text-primary" },
  { icon: "🏗️", label: "Construction", color: "text-[hsl(45_90%_45%)]" },
  { icon: "📐", label: "Agrandissement", color: "text-[hsl(160_55%_40%)]" },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [index, setIndex] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [rippling, setRippling] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const releaseTimeout = useRef<number | null>(null);

  // Rotate headline
  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_ITEMS.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (releaseTimeout.current) window.clearTimeout(releaseTimeout.current);
    };
  }, []);

  const current = useMemo(() => ROTATING_ITEMS[index], [index]);

  const handlePressStart = useCallback(() => {
    if (transitioning) return;
    setPressed(true);
  }, [transitioning]);

  const handlePressEnd = useCallback(() => {
    if (transitioning) return;
    setPressed(false);
    setRippling(true);
    setTransitioning(true);

    releaseTimeout.current = window.setTimeout(() => {
      setRippling(false);
      navigate(isAuthenticated ? "/describe-project" : "/signup");
    }, 220);
  }, [transitioning, navigate, isAuthenticated]);

  const handlePressCancel = useCallback(() => setPressed(false), []);

  return (
    <motion.section
      animate={{
        opacity: transitioning ? 0.78 : 1,
        y: transitioning ? -6 : 0,
        filter: transitioning ? "blur(2px)" : "blur(0px)",
      }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      className="relative overflow-hidden pb-8"
      style={{
        background: "linear-gradient(180deg, #EEF7FF 0%, #DDEFFF 58%, #D6EBFF 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full bg-white/35 blur-3xl" />
        <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full bg-[hsl(200_80%_80%)]/25 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full bg-[hsl(230_60%_80%)]/20 blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-md px-5 pt-8">
        {/* ── Grid: Headline + Image ── */}
        <div className="grid grid-cols-[1.1fr_0.9fr] items-start gap-4">
          {/* Headline */}
          <div className="min-w-0">
            <h1 className="text-[2.6rem] font-extrabold leading-[0.94] tracking-[-0.05em] text-foreground">
              <span className="block">Trouvez</span>

              <span className="mt-1 block min-h-[1.18em]">
                <span className="mr-2">le</span>
                <span className="relative inline-block min-w-[170px] align-top">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`p-${index}`}
                      variants={textVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.42, ease: "easeOut" }}
                      className="inline-block text-primary [text-shadow:0_0_18px_hsl(var(--primary)/0.16)]"
                    >
                      {current.profession}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>

              <span className="mt-1 block min-h-[2.22em] leading-[1.02]">
                <span>idéal pour </span>
                <span className="relative inline-block max-w-[13ch] align-top">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`a-${index}`}
                      variants={textVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.42, ease: "easeOut", delay: 0.03 }}
                      className="inline-block text-[hsl(225_70%_55%)]"
                    >
                      {current.action}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </h1>

            <p className="mt-6 max-w-[260px] text-lg leading-8 text-muted-foreground">
              Comparez, évaluez et choisissez en toute confiance.
            </p>
          </div>

          {/* Image card + robot */}
          <div className="relative">
            <motion.div
              animate={{
                y: transitioning ? -4 : 0,
                scale: transitioning ? 0.985 : 1,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="overflow-hidden rounded-[28px] bg-white/75 shadow-[0_22px_64px_rgba(34,72,145,0.18)] ring-1 ring-white/70 backdrop-blur-xl"
            >
              <img
                src={heroHouse}
                alt="Maison moderne"
                className="h-[184px] w-full object-cover"
                loading="eager"
              />
            </motion.div>

            <motion.img
              src={unproRobot}
              alt="Alex UNPRO"
              animate={{
                y: transitioning ? -2 : 0,
                scale: transitioning ? 0.985 : 1,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute -right-4 -bottom-7 w-[94px] drop-shadow-[0_22px_30px_rgba(0,0,0,0.20)]"
            />
          </div>
        </div>

        {/* ── Search CTA card ── */}
        <motion.div
          animate={{
            y: transitioning ? -3 : 0,
            opacity: transitioning ? 0.92 : 1,
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-8 rounded-[30px] bg-white/90 p-5 shadow-[0_18px_50px_rgba(51,93,177,0.13)] ring-1 ring-white/70 backdrop-blur-xl"
        >
          <h2 className="mb-4 text-lg font-bold text-foreground">
            Quel type de travaux ?
          </h2>

          <div className="flex items-center gap-3">
            <div className="flex h-14 flex-1 items-center rounded-full border border-border/60 bg-muted/50 px-4 text-muted-foreground">
              <span className="mr-3 text-base">🏠</span>
              <span className="truncate text-sm">
                Ex: Rénovation, cuisine, toiture…
              </span>
            </div>

            {/* Premium pressable CTA button */}
            <motion.button
              type="button"
              aria-label="Rechercher"
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressCancel}
              onPointerCancel={handlePressCancel}
              animate={{
                scale: pressed ? 0.94 : 1,
                y: pressed ? 2 : 0,
                boxShadow: pressed
                  ? "inset 0 6px 12px rgba(0,0,0,0.14), 0 6px 14px rgba(41,197,255,0.22)"
                  : "0 14px 28px rgba(41,197,255,0.34)",
              }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(195_100%_55%))] text-primary-foreground"
            >
              {/* Ripple */}
              <motion.span
                animate={{
                  opacity: rippling ? [0, 0.35, 0] : 0,
                  scale: rippling ? [0.7, 1.5, 1.9] : 0.7,
                }}
                transition={{ duration: 0.42, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-white"
              />
              <ArrowRight className="relative z-10 h-5 w-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* ── Popular chips ── */}
        <motion.div
          animate={{
            y: transitioning ? -2 : 0,
            opacity: transitioning ? 0.92 : 1,
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-6"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Populaire
          </p>
          <div className="flex flex-wrap gap-3">
            {popularTags.map((tag) => (
              <span
                key={tag.label}
                className={`rounded-full bg-white px-5 py-3 text-base font-semibold shadow-[0_8px_24px_rgba(75,114,191,0.08)] ring-1 ring-white/80 ${tag.color}`}
              >
                {tag.icon} {tag.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-[-2px] left-0 right-0 pointer-events-none z-[2]">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
          <path d="M0 80C200 40 400 100 600 70C800 40 1000 90 1200 60C1350 45 1440 70 1440 60V120H0V80Z" fill="#F0F4FA" />
        </svg>
      </div>
    </motion.section>
  );
}
