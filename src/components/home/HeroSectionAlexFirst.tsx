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
import {
  Mic, Camera, ShieldCheck, Sparkles, MapPin,
  Calculator, ShieldAlert, FileText, AlertTriangle, HelpCircle, UserCheck,
} from "lucide-react";
import { listIntents, HERO_CHIP_INTENTS, type AlexIntent, type AlexIntentId } from "@/services/alexIntentRouter";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

const CHIP_ICONS: Record<AlexIntentId, typeof Calculator> = {
  project_estimate:   Calculator,
  verify_contractor:  ShieldAlert,
  quote_compare:      FileText,
  urgent_problem:     AlertTriangle,
  upload_photo:       Camera,
  unsure:             HelpCircle,
  talk_to_alex:       Mic,
};

const AlexAssistantSheet = lazy(() => import("@/components/alex/AlexAssistantSheet"));
const UploadPhotoModal = lazy(() => import("@/components/home/UploadPhotoModal"));

const cinematicBgPoster = "/images/hero-bg.webp";
const cinematicBgMp4 = "/images/hero-bg.mp4";
const cinematicBgWebm = "/images/hero-bg.webm";

const CHIPS: AlexIntent[] = listIntents(HERO_CHIP_INTENTS);

const TRUST = [
  { icon: ShieldCheck, label: "Entrepreneurs vérifiés", color: "text-emerald-400/80" },
  { icon: UserCheck,   label: "Pas de leads partagés", color: "text-amber-400/80" },
  { icon: Sparkles,    label: "Analyse IA impartiale",  color: "text-violet-400/80" },
  { icon: MapPin,      label: "Service québécois",      color: "text-sky-400/80" },
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

  const onChipClick = useCallback((chip: AlexIntent) => {
    if (chip.id === "upload_photo") {
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[460px] animate-pulse"
            style={{
              background:
                "radial-gradient(ellipse, hsl(222 100% 60% / 0.18) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* ── Content column ── */}
        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-xl mx-auto px-5 pt-8 pb-24 gap-6 sm:gap-8">
          {/* AI label chip */}
          <div
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium tracking-wide"
            style={{
              background: "rgba(80,140,255,0.08)",
              border: "1px solid rgba(120,170,255,0.22)",
              color: "hsl(210 100% 78%)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Sparkles className="h-3 w-3" />
            <span>ALEX · VOTRE EXPERT IA</span>
          </div>

          {/* H1 — instant LCP, no animation */}
          <header className="flex flex-col items-center gap-3">
            <h1 className="font-display font-bold text-white leading-[1.05] tracking-tight text-[34px] sm:text-[46px] md:text-[54px]">
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
            style={{ width: 150, height: 150 }}
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background:
                  "radial-gradient(circle, hsl(222 100% 60% / 0.28) 0%, transparent 70%)",
              }}
            />
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{
                width: 132,
                height: 132,
                border: "1.5px solid hsl(222 100% 65% / 0.28)",
                boxShadow: "0 0 50px hsl(222 100% 65% / 0.2)",
              }}
            />
            <span
              className="relative rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
              style={{
                width: 110,
                height: 110,
                background:
                  "linear-gradient(135deg, hsl(222 100% 50% / 0.95), hsl(232 100% 28% / 0.96))",
                border: "2px solid hsl(222 100% 72% / 0.36)",
                boxShadow:
                  "0 0 70px -10px hsl(222 100% 65% / 0.6), 0 0 120px -20px hsl(252 100% 60% / 0.4), inset 0 1px 1px hsl(0 0% 100% / 0.14)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 38% 30%, hsl(210 100% 82% / 0.45), transparent 60%)",
                }}
              />
              <Mic className="h-10 w-10 text-white relative z-10" strokeWidth={1.5} />
            </span>
          </button>

          {/* AI live status */}
          <div className="flex items-center gap-2 -mt-2 text-xs sm:text-[13px] text-white/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
              <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>Alex est prêt à vous aider</span>
          </div>

          {/* ── Input bar ── */}
          <form onSubmit={onSubmit} className="w-full max-w-lg">
            <div
              className="flex items-center gap-2 rounded-full pl-5 pr-2 py-2 backdrop-blur-xl"
              style={{
                background: "rgba(255,255,255,0.05)",
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
                className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none py-2"
              />
              <button
                type="button"
                onClick={() => openAlex()}
                aria-label="Parler à Alex au micro"
                className="h-10 w-10 flex items-center justify-center rounded-full text-white transition-all active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(222 100% 58%), hsl(232 100% 42%))",
                  boxShadow: "0 4px 18px hsl(222 100% 55% / 0.45)",
                }}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                aria-label="Téléverser une photo"
                className="h-10 w-10 flex items-center justify-center rounded-full text-white/75 hover:text-white transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* ── Chip pills ── */}
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {CHIPS.map((chip) => {
              const Icon = CHIP_ICONS[chip.id] ?? Sparkles;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onChipClick(chip)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-medium px-3.5 py-2 rounded-full text-white/75 hover:text-white transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5 text-white/55" strokeWidth={1.8} />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Trust strip ── */}
          <ul className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-x-6 gap-y-3 text-[11px] sm:text-xs text-white/55 mt-2">
            {TRUST.map(({ icon: Icon, label, color }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.8} />
                <span className="leading-tight">{label}</span>
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
