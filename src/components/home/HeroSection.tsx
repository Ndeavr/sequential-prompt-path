/**
 * HeroSectionCinematicAlex — Immersive cinematic hero with Alex orb,
 * intent selector pills, and UNPRO brand glow.
 * Voice-first with Gemini Live Native Audio.
 * Pills: Problème, Projet, Avis — all start Alex & allow photo upload.
 * 
 * SINGLETON GUARD: This is the PRIMARY Alex source on home page.
 * Uses alexRuntime lock to prevent any duplicate voice.
 */
import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { useAlexSingleton } from "@/hooks/useAlexSingleton";
import { useAlexHomeAutostart } from "@/hooks/useAlexHomeAutostart";
import { alexRuntime } from "@/services/alexRuntimeSingleton";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";
import { Mic, Volume2, Loader2, Keyboard, Square, VolumeX, AlertTriangle, Sparkles, MessageSquare, ArrowRight, Camera, FileSearch } from "lucide-react";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";
import UploadPhotoModal from "@/components/home/UploadPhotoModal";

const cinematicBg = "/images/hero-bg.gif";

type IntentSlug = "probleme" | "projet" | "avis";

const INTENTS = [
  {
    slug: "probleme" as IntentSlug,
    label: "Problème",
    icon: AlertTriangle,
    cta: "Détecter un problème",
    ctaIcon: Camera,
    ctaSec: null,
    route: "/describe-project?intent=problem",
  },
  {
    slug: "projet" as IntentSlug,
    label: "Projet",
    icon: Sparkles,
    cta: "Décrire mon projet",
    ctaIcon: Camera,
    ctaSec: null,
    route: "/describe-project",
  },
  {
    slug: "avis" as IntentSlug,
    label: "Avis",
    icon: MessageSquare,
    cta: "Analyser 3 soumissions",
    ctaIcon: FileSearch,
    ctaSec: null,
    route: "/describe-project?intent=quote-analysis",
  },
];

const COMPONENT_NAME = 'HeroSectionCinematicAlex';

export default function HeroSection() {
  const { user } = useAuth();
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [activeIntent, setActiveIntent] = useState<IntentSlug>("probleme");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const alexTranscriptRef = useRef("");

  // Singleton guard — register as primary
  const { isPrimary, acquireLock, releaseLock, markActive } = useAlexSingleton(COMPONENT_NAME, 'primary');

  const { start, stop, isActive, isConnecting, isSpeaking } = useLiveVoice({
    onTranscript: (text) => {
      // Accumulate Alex's transcript to detect photo-related questions
      alexTranscriptRef.current += text;
      const lower = alexTranscriptRef.current.toLowerCase();
      const photoKeywords = ["photo", "image", "téléverser", "téléversez", "envoyer une photo", "uploader", "fichier", "picture"];
      const hasPhotoAsk = photoKeywords.some(kw => lower.includes(kw));
      if (hasPhotoAsk && !uploadModalOpen) {
        // Alex asked about photo — will show upload when user says yes or after turn completes
        console.log("[Hero] Alex mentioned photo — priming upload trigger");
      }
    },
    onUserTranscript: (text) => {
      // Detect user saying "yes" after Alex asked about photo
      const lower = text.toLowerCase();
      const alexLower = alexTranscriptRef.current.toLowerCase();
      const photoKeywords = ["photo", "image", "téléverser", "téléversez", "envoyer une photo", "uploader"];
      const alexAskedPhoto = photoKeywords.some(kw => alexLower.includes(kw));
      const userSaysYes = ["oui", "yes", "ok", "d'accord", "parfait", "bien sûr", "go", "envoyer", "envoie"].some(y => lower.includes(y));
      if (alexAskedPhoto && userSaysYes) {
        console.log("[Hero] User confirmed photo — opening upload modal");
        setUploadModalOpen(true);
        alexTranscriptRef.current = ""; // Reset
      }
    },
    onConnect: () => {
      console.log("[Hero] Gemini Live connected");
      markActive('gemini-live');
    },
    onDisconnect: () => {
      console.log("[Hero] Gemini Live disconnected");
      releaseLock();
    },
    onError: (err) => {
      console.error("[Hero] Gemini Live error:", err);
      releaseLock();
    },
  });

  const orbState = isConnecting ? "thinking" : isActive ? (isSpeaking ? "speaking" : "listening") : "idle";
  const voiceActive = isActive || isConnecting;
  const current = INTENTS.find((i) => i.slug === activeIntent)!;

  const getIntentGreeting = useCallback((intent: IntentSlug) => {
    const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.first_name || null;
    const hour = new Date().getHours();
    
    // Time-based greeting: Bonjour / Bon après-midi / Bonsoir
    let timeGreeting: string;
    if (hour >= 5 && hour < 12) {
      timeGreeting = "Bonjour";
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = "Bon après-midi";
    } else {
      timeGreeting = "Bonsoir";
    }
    
    const hi = firstName ? `${timeGreeting} ${firstName}!` : `${timeGreeting}!`;

    switch (intent) {
      case "probleme":
        return `${hi} Je peux vous aider à trouver une solution! Avez-vous une photo ou pouvez-vous me décrire votre problème?`;
      case "projet":
        return `${hi} Un nouveau projet? Je peux certainement vous aider! Avez-vous une photo de ce que vous voulez améliorer ou pouvez-vous me décrire votre projet?`;
      case "avis":
        return `${hi} Vous aimeriez que j'analyse vos soumissions? Pas de problème! Vous pouvez les téléverser ou les prendre en photo ici.`;
      default:
        return `${hi} Comment puis-je vous aider?`;
    }
  }, [user]);

  const startVoice = useCallback((intent?: IntentSlug) => {
    // SINGLETON GUARD: Must acquire lock before starting
    if (!isPrimary) {
      console.warn(`[Hero] Not primary — cannot start voice`);
      return;
    }

    const locked = acquireLock();
    if (!locked) {
      console.warn(`[Hero] Lock rejected — another Alex instance is active`);
      return;
    }

    // Kill all other audio sources BEFORE starting
    // But DON'T dispatch alex-voice-cleanup here — it can race-kill the new session
    alexAudioChannel.hardStop();

    const selectedIntent = intent || activeIntent;
    const greeting = getIntentGreeting(selectedIntent);
    start({ initialGreeting: greeting });
    alexTranscriptRef.current = ""; // Reset transcript tracking
  }, [start, getIntentGreeting, activeIntent, isPrimary, acquireLock]);

  const stopVoice = useCallback(() => {
    stop();
    releaseLock();
  }, [stop, releaseLock]);

  // Auto-start (controlled via singleton)
  useAlexHomeAutostart({
    enabled: true,
    isPrimary,
    onAutostart: () => startVoice(),
  });

  const statusText =
    orbState === "speaking" ? "Alex vous parle…"
    : orbState === "thinking" ? "Connexion…"
    : orbState === "listening" ? "Je vous écoute…"
    : "Parlez à Alex";

  return (
    <>
      <section
        className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center overflow-hidden landing-dot-grid"
        data-testid="hero-section-alex"
      >

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto w-full px-5 pt-6 pb-20">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="font-landing text-[32px] sm:text-[44px] md:text-[52px] font-normal text-foreground leading-[1.1] tracking-tight">
              Passez à{" "}
              <span className="font-semibold">
                l'intelligence
              </span>
              <br />du bâtiment
            </h1>
            <p className="mt-4 text-[17px] text-muted-foreground max-w-md mx-auto leading-relaxed">
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
                  className={`relative flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-250 ${
                    isAct
                      ? "bg-foreground text-background border border-foreground"
                      : "bg-transparent text-muted-foreground border border-border hover:border-foreground/20"
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <intent.icon className="h-3.5 w-3.5" />
                  {intent.label}
                </motion.button>
              );
            })}
          </motion.div>

          {/* ── Cinematic Voice Orb ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.55, type: "spring", stiffness: 180 }}
            className="mt-10 mb-5 flex flex-col items-center"
            data-testid="alex-orb-primary"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer breathing ring */}
              <motion.div
                className="absolute rounded-full pointer-events-none border border-border"
                style={{ width: 130, height: 130 }}
                animate={{ scale: voiceActive ? [1, 1.12, 1] : [1, 1.04, 1] }}
                transition={{ duration: voiceActive ? 1.2 : 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Listening pulses */}
              {orbState === "listening" && [0, 1].map((i) => (
                <motion.div key={i} className="absolute rounded-full pointer-events-none border border-foreground/15"
                  style={{ width: 120, height: 120 }}
                  animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                />
              ))}

              {/* Speaking waves */}
              {orbState === "speaking" && [0, 1].map((i) => (
                <motion.div key={`s${i}`} className="absolute rounded-full pointer-events-none border border-foreground/15"
                  style={{ width: 120, height: 120 }}
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                />
              ))}

              {/* Thinking */}
              {orbState === "thinking" && (
                <motion.div className="absolute rounded-full pointer-events-none border-2 border-dashed border-foreground/15"
                  style={{ width: 130, height: 130 }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Main orb — charcoal */}
              <motion.button
                onClick={() => voiceActive ? stopVoice() : startVoice()}
                className="relative rounded-full flex items-center justify-center overflow-hidden z-10 bg-foreground"
                style={{ width: 96, height: 96 }}
                animate={
                  orbState === "speaking" ? { scale: [1, 1.08, 1] }
                  : orbState === "listening" ? { scale: [1, 1.05, 1] }
                  : { scale: [1, 1.03, 1] }
                }
                transition={{ duration: orbState === "speaking" ? 0.6 : orbState === "listening" ? 1.2 : 2.5, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                data-testid="alex-orb-button"
              >
                {orbState === "speaking" ? (
                  <Volume2 className="h-9 w-9 text-background relative z-10" />
                ) : orbState === "thinking" ? (
                  <Loader2 className="h-9 w-9 text-background relative z-10 animate-spin" />
                ) : (
                  <Mic className="h-9 w-9 text-background relative z-10" />
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
                className="mt-4 text-xs font-medium text-muted-foreground"
              >
                {statusText}
              </motion.p>
            </AnimatePresence>

            {/* Voice controls */}
            <AnimatePresence>
              {voiceActive && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-3 flex items-center gap-2">
                  {orbState === "speaking" && (
                    <button onClick={stopVoice} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-muted-foreground border border-border hover:border-foreground/20 transition-colors">
                      <VolumeX className="h-3 w-3" /> Couper
                    </button>
                  )}
                  <button onClick={() => { stopVoice(); setTextSheetOpen(true); }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-muted-foreground border border-border hover:border-foreground/20 transition-colors">
                    <Keyboard className="h-3 w-3" /> Écrire
                  </button>
                  <button onClick={stopVoice} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                    <Square className="h-2.5 w-2.5" /> Arrêter
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Context CTA — pill-shaped charcoal ── */}
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
                onClick={() => startVoice(activeIntent)}
                className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-[0.97] bg-foreground text-background hover:opacity-90"
              >
                <current.ctaIcon className="h-4 w-4" />
                {current.cta}
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <AlexAssistantSheet open={textSheetOpen} onClose={() => setTextSheetOpen(false)} />

      <UploadPhotoModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onFilesSelected={(files) => {
          console.log("[Hero] Files uploaded via modal:", files.length, files.map(f => f.name));
          // TODO: Send files to Alex for analysis
        }}
      />
    </>
  );
}
