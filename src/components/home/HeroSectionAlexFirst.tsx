/**
 * HeroSectionAlexFirst — AI-native homepage hero (ChatGPT/Perplexity style)
 *
 * Goals:
 * - LCP-first: H1 paints at frame 0 (no opacity:0, no AnimatePresence wrapper)
 * - Orb visible immediately, voice deferred until first user gesture
 * - Single screen: header → h1 → subtext → orb → input → chips → trust strip
 * - Dark premium theme preserved (blue aura, glassmorphism)
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Mic, Camera, ArrowUp, ShieldCheck, Sparkles, Bot, MapPin } from "lucide-react";

const AlexAssistantSheet = lazy(() => import("@/components/alex/AlexAssistantSheet"));
const UploadPhotoModal = lazy(() => import("@/components/home/UploadPhotoModal"));

const cinematicBgPoster = "/images/hero-bg.webp";
const cinematicBgMp4 = "/images/hero-bg.mp4";
const cinematicBgWebm = "/images/hero-bg.webm";

const CHIPS: Array<{ label: string; preset: string }> = [
  { label: "Estimer un projet",        preset: "J'aimerais estimer un projet." },
  { label: "Vérifier un entrepreneur", preset: "Je veux vérifier un entrepreneur." },
  { label: "Comparer 3 soumissions",   preset: "J'ai des soumissions à comparer." },
  { label: "Problème urgent",          preset: "J'ai un problème urgent à la maison." },
  { label: "Téléverser une photo",     preset: "" },
  { label: "Je ne sais pas",           preset: "Je ne sais pas par où commencer." },
];

const TRUST = [
  { icon: ShieldCheck, label: "Entrepreneurs vérifiés" },
  { icon: Bot,         label: "Analyse IA" },
  { icon: Sparkles,    label: "Pas de leads partagés" },
  { icon: MapPin,      label: "Service québécois" },
];

export default function HeroSectionAlexFirst() {
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [initialChip, setInitialChip] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [mountVideo, setMountVideo] = useState(false);
  const interactedRef = useRef(false);

  // Defer heavy bg video until idle — poster (WebP, ~106KB) carries LCP
  useEffect(() => {
    const w = window as any;
    const idle = w.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 800));
    const id = idle(() => setMountVideo(true), { timeout: 1500 });
    return () => {
      if (w.cancelIdleCallback && typeof id === "number") w.cancelIdleCallback(id);
    };
  }, []);

  const openAlex = useCallback((preset?: string) => {
    interactedRef.current = true;
    setInitialChip(preset);
    setTextSheetOpen(true);
  }, []);

  const onChipClick = useCallback((chip: { label: string; preset: string }) => {
    if (chip.label === "Téléverser une photo") {
      setUploadModalOpen(true);
      return;
    }
    openAlex(chip.preset);
  }, [openAlex]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) {
      openAlex();
      return;
    }
    openAlex(v);
    setInput("");
  }, [input, openAlex]);

  return (
    <>
      <section
        className="relative flex flex-col items-center overflow-hidden"
        style={{ minHeight: "calc(100dvh - 64px)" }}
        data-testid="hero-alex-first"
      >
        {/* ── Background: poster instantly, video idle-deferred ── */}
        <div className="absolute inset-0 z-0">
          <img
            src={cinematicBgPoster}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            decoding="async"
            // @ts-ignore — fetchpriority is valid HTML
            fetchpriority="high"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {mountVideo && (
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster={cinematicBgPoster}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={cinematicBgWebm} type="video/webm" />
              <source src={cinematicBgMp4} type="video/mp4" />
            </video>
          )}
        </div>

        {/* Cinematic overlay */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(4,8,20,0.62) 0%, rgba(4,8,20,0.78) 45%, rgba(4,8,20,0.96) 100%)",
          }}
        />

        {/* Soft aura around orb */}
        <div className="absolute inset-0 z-[2] pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[460px] animate-pulse-slow"
            style={{
              background:
                "radial-gradient(ellipse, hsl(222 100% 60% / 0.18) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* ── Content column ── */}
        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-xl mx-auto px-5 pt-10 pb-24 gap-7 sm:gap-9">
          {/* H1 — instant LCP, no animation */}
          <header className="flex flex-col items-center gap-3">
            <h1 className="font-display font-bold text-white leading-[1.05] tracking-tight text-[32px] sm:text-[44px] md:text-[52px]">
              Décrivez votre problème.
              <br />
              <span className="bg-gradient-to-r from-[hsl(222,100%,72%)] via-[hsl(195,100%,62%)] to-[hsl(252,100%,74%)] bg-clip-text text-transparent">
                Alex s'occupe du reste.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-white/55 max-w-md leading-relaxed">
              Analyse. Estimation. Vérification. Réservation.
            </p>
          </header>

          {/* ── Alex Orb (96px, breathing) ── */}
          <button
            type="button"
            onClick={() => openAlex()}
            aria-label="Parler à Alex"
            data-testid="alex-orb-button"
            className="relative flex items-center justify-center group focus:outline-none"
            style={{ width: 130, height: 130 }}
          >
            {/* outer breathing ring */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full animate-pulse-slow"
              style={{
                background:
                  "radial-gradient(circle, hsl(222 100% 60% / 0.22) 0%, transparent 70%)",
              }}
            />
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{
                width: 116,
                height: 116,
                border: "1.5px solid hsl(222 100% 65% / 0.22)",
                boxShadow: "0 0 40px hsl(222 100% 65% / 0.15)",
              }}
            />
            {/* main orb */}
            <span
              className="relative rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
              style={{
                width: 96,
                height: 96,
                background:
                  "linear-gradient(135deg, hsl(222 100% 45% / 0.92), hsl(222 100% 25% / 0.95))",
                border: "2px solid hsl(222 100% 70% / 0.32)",
                boxShadow:
                  "0 0 60px -10px hsl(222 100% 65% / 0.55), 0 0 100px -20px hsl(222 100% 55% / 0.35), inset 0 1px 1px hsl(0 0% 100% / 0.12)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 38% 32%, hsl(222 100% 78% / 0.4), transparent 60%)",
                }}
              />
              <Mic className="h-9 w-9 text-white/90 relative z-10" strokeWidth={1.6} />
            </span>
          </button>

          {/* ── Input bar ── */}
          <form onSubmit={onSubmit} className="w-full max-w-lg">
            <div
              className="flex items-center gap-1 rounded-full pl-5 pr-1.5 py-1.5 backdrop-blur-xl"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 32px hsl(222 100% 30% / 0.25)",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Décrivez votre projet…"
                aria-label="Décrivez votre projet"
                className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-white/35 focus:outline-none py-2.5"
              />
              <button
                type="button"
                onClick={() => openAlex()}
                aria-label="Parler à Alex au micro"
                className="h-10 w-10 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                aria-label="Téléverser une photo"
                className="h-10 w-10 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                type="submit"
                aria-label="Envoyer à Alex"
                className="h-10 w-10 flex items-center justify-center rounded-full text-white transition-all active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(222 100% 55%), hsl(222 100% 42%))",
                  boxShadow: "0 4px 16px hsl(222 100% 55% / 0.4)",
                }}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* ── Chip pills ── */}
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => onChipClick(chip)}
                className="text-xs sm:text-[13px] font-medium px-3.5 py-2 rounded-full text-white/70 hover:text-white transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* ── Trust strip ── */}
          <ul className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-white/45 mt-2">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-white/55" strokeWidth={1.8} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 z-[3] pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, hsl(228 40% 7%) 0%, transparent 100%)",
          }}
        />
      </section>

      <Suspense fallback={null}>
        {textSheetOpen && (
          <AlexAssistantSheet
            open={textSheetOpen}
            onClose={() => setTextSheetOpen(false)}
            initialChip={initialChip}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {uploadModalOpen && (
          <UploadPhotoModal
            open={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onFilesSelected={(files) => {
              console.log("[HeroAlexFirst] Files uploaded:", files.length);
            }}
          />
        )}
      </Suspense>
    </>
  );
}
