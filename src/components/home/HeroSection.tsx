/**
 * HeroSection — Premium mobile-first UNPRO hero with stable rotating headline,
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
  { article: "le", profession: "couvreur", action: "refaire votre toiture" },
  { article: "le", profession: "designer", action: "concevoir votre cuisine" },
  { article: "l'", profession: "électricien", action: "changer la boîte de disjoncteurs" },
  { article: "l'", profession: "arpenteur-géomètre", action: "obtenir un certificat de localisation" },
  { article: "le", profession: "paysagiste", action: "installer de la tourbe" },
  { article: "le", profession: "plombier", action: "rénover votre salle de bain" },
  { article: "le", profession: "maçon", action: "réparer votre fondation" },
  { article: "le", profession: "notaire", action: "gérer votre transaction" },
  { article: "le", profession: "contracteur", action: "agrandir votre maison" },
  { article: "l'", profession: "isoleur", action: "isoler votre grenier" },
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

export default function HeroSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [index, setIndex] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [rippling, setRippling] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const releaseTimeout = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_ITEMS.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, []);

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
          {/* Left column: headline + subtitle + search + chips */}
          <div className="min-w-0">
            {/* Fixed-height title container — content below never shifts */}
            <div className="min-h-[280px] sm:min-h-[300px] md:min-h-[360px]">
              <h1 className="max-w-[680px] text-[2.6rem] font-extrabold leading-[0.95] tracking-[-0.05em] text-foreground sm:text-[3.25rem] md:text-[4.25rem]">
                {/* Line 1: fixed */}
                <span className="block">Trouvez</span>

                {/* Line 2: animated article + profession */}
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

                {/* Line 3: fixed */}
                <span className="mt-1 block text-foreground">idéal pour</span>

                {/* Line 4: animated action */}
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

            {/* Subtitle — outside animated zone */}
            <p className="max-w-[420px] text-lg leading-8 text-muted-foreground md:text-xl md:leading-10">
              Comparez, évaluez et choisissez en toute confiance.
            </p>

            {/* Search CTA card — outside animated zone */}
            <motion.div
              animate={{
                y: transitioning ? -3 : 0,
                opacity: transitioning ? 0.92 : 1,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-8 max-w-[650px] rounded-[30px] bg-card/90 p-5 shadow-[0_18px_50px_rgba(51,93,177,0.13)] ring-1 ring-border/30 backdrop-blur-xl"
            >
              <h2 className="mb-4 text-lg font-bold text-foreground md:text-xl">
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
                    className="absolute inset-0 rounded-full bg-background"
                  />
                  <ArrowRight className="relative z-10 h-5 w-5" />
                </motion.button>
              </div>
            </motion.div>

            {/* Popular chips — outside animated zone */}
            <motion.div
              animate={{
                y: transitioning ? -2 : 0,
                opacity: transitioning ? 0.92 : 1,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-5"
            >
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
            </motion.div>
          </div>

          {/* Right column: image card + robot */}
          <div className="relative mx-auto w-full max-w-[280px] md:max-w-[420px]">
            <motion.div
              animate={{
                y: transitioning ? -4 : 0,
                scale: transitioning ? 0.985 : 1,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="overflow-hidden rounded-[28px] bg-card/75 shadow-[0_22px_64px_rgba(34,72,145,0.18)] ring-1 ring-border/30 backdrop-blur-xl md:rounded-[32px]"
            >
              <img
                src={heroHouse}
                alt="Maison moderne"
                className="aspect-square w-full object-cover md:aspect-[1/1]"
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
    </motion.section>
  );
}
