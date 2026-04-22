/**
 * HeroSection — Premium Alex Opening Choreography
 * 
 * 4-state staged sequence:
 * State 1 (0ms):     Arrival — orb alive, hero text visible, background alive
 * State 2 (200ms):   Dissolve — hero text fades, live surface emerges
 * State 3 (800ms):   Presence — transcript panel visible, "Alex en direct" label
 * State 4 (2200ms):  Voice — Alex speaks short French greeting, live transcript
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { useAlexSingleton } from "@/hooks/useAlexSingleton";
import { alexRuntime } from "@/services/alexRuntimeSingleton";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";
import { Mic, Volume2, Loader2, Keyboard, Square, VolumeX, Camera, FileSearch, Sparkles, AlertTriangle, MessageSquare, ArrowRight } from "lucide-react";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";
import UploadPhotoModal from "@/components/home/UploadPhotoModal";

const cinematicBg = "/images/hero-bg.gif";

type IntentSlug = "probleme" | "projet" | "avis";
type StagePhase = "arrival" | "dissolve" | "presence" | "speaking" | "ready";

const INTENTS = [
  { slug: "probleme" as IntentSlug, label: "Problème", icon: AlertTriangle, cta: "Détecter un problème", ctaIcon: Camera, route: "/describe-project?intent=problem" },
  { slug: "projet" as IntentSlug, label: "Projet", icon: Sparkles, cta: "Décrire mon projet", ctaIcon: Camera, route: "/describe-project" },
  { slug: "avis" as IntentSlug, label: "Avis", icon: MessageSquare, cta: "Analyser 3 soumissions", ctaIcon: FileSearch, route: "/describe-project?intent=quote-analysis" },
];

const COMPONENT_NAME = "HeroSectionCinematicAlex";

const SHORT_GREETINGS = [
  "Bonjour. Quel est votre projet?",
  "Bonjour. Je vous écoute.",
  "Bonjour. Montrez-moi le problème.",
];

function pickGreeting(): string {
  return SHORT_GREETINGS[Math.floor(Math.random() * SHORT_GREETINGS.length)];
}

// Timing constants (ms)
const T_DISSOLVE = 200;
const T_PRESENCE = 800;
const T_VOICE_START = 2200;

export default function HeroSection() {
  const { user } = useAuth();
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [activeIntent, setActiveIntent] = useState<IntentSlug>("probleme");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const alexTranscriptRef = useRef("");
  const connectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Staged choreography state ──
  const [phase, setPhase] = useState<StagePhase>("arrival");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [localGreeting] = useState(pickGreeting);
  const voiceAttemptedRef = useRef(false);

  const { isPrimary, acquireLock, releaseLock, markActive } = useAlexSingleton(COMPONENT_NAME, "primary");

  const { start, stop, isActive, isConnecting, isSpeaking } = useLiveVoice({
    onTranscript: (text) => {
      alexTranscriptRef.current += text;
      setLiveTranscript(text);
      // Auto-detect photo keywords
      const lower = alexTranscriptRef.current.toLowerCase();
      const photoKw = ["photo", "image", "téléverser", "envoyer une photo"];
      if (photoKw.some((kw) => lower.includes(kw)) && !uploadModalOpen) {
        console.log("[Hero] Alex mentioned photo");
      }
    },
    onUserTranscript: (text) => {
      const lower = text.toLowerCase();
      const alexLower = alexTranscriptRef.current.toLowerCase();
      const photoKw = ["photo", "image", "téléverser", "envoyer une photo"];
      const yesKw = ["oui", "yes", "ok", "d'accord", "parfait", "go", "envoyer"];
      if (photoKw.some((kw) => alexLower.includes(kw)) && yesKw.some((y) => lower.includes(y))) {
        setUploadModalOpen(true);
        alexTranscriptRef.current = "";
      }
    },
    onConnect: () => {
      console.log("[Hero] Voice connected");
      setVoiceFailed(false);
      setPhase("speaking");
      markActive("gemini-live");
    },
    onFirstAudio: () => {
      setPhase("speaking");
    },
    onDisconnect: () => {
      console.log("[Hero] Voice disconnected");
      if (phase === "speaking") setPhase("ready");
      releaseLock();
    },
    onError: (err) => {
      console.error("[Hero] Voice error:", err);
      setVoiceFailed(true);
      setPhase("ready");
      releaseLock();
    },
  });

  // ── Choreography timer ──
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("dissolve"), T_DISSOLVE);
    const t2 = setTimeout(() => setPhase("presence"), T_PRESENCE);
    const t3 = setTimeout(() => {
      if (!voiceAttemptedRef.current) {
        voiceAttemptedRef.current = true;
        triggerVoiceStart();
      }
    }, T_VOICE_START);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connecting >5s → fallback
  useEffect(() => {
    if (isConnecting) {
      connectingTimerRef.current = setTimeout(() => {
        setVoiceFailed(true);
        setPhase("ready");
      }, 5000);
    } else {
      if (connectingTimerRef.current) {
        clearTimeout(connectingTimerRef.current);
        connectingTimerRef.current = null;
      }
    }
    return () => {
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
    };
  }, [isConnecting]);

  // Update phase based on voice state
  useEffect(() => {
    if (isActive && isSpeaking) setPhase("speaking");
    else if (isActive && !isSpeaking) setPhase("speaking"); // listening within speaking phase
  }, [isActive, isSpeaking]);

  const triggerVoiceStart = useCallback(() => {
    if (!isPrimary) return;
    const rtState = alexRuntime.getState();
    if (rtState.sessionStatus === "ended" || rtState.sessionStatus === "failed") {
      alexRuntime.clearForRestart();
    }
    const locked = acquireLock();
    if (!locked) {
      setPhase("ready");
      return;
    }
    alexAudioChannel.hardStop();
    setVoiceFailed(false);

    const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.first_name || null;
    const greeting = firstName ? `Bonjour ${firstName}. Quel est votre projet?` : localGreeting;
    start({ initialGreeting: greeting, force: true });
    alexTranscriptRef.current = "";
  }, [isPrimary, acquireLock, start, user, localGreeting]);

  const startVoice = useCallback((intent?: IntentSlug) => {
    if (!isPrimary) return;
    const rtState = alexRuntime.getState();
    if (rtState.sessionStatus === "ended" || rtState.sessionStatus === "failed") {
      alexRuntime.clearForRestart();
    }
    const locked = acquireLock();
    if (!locked) return;
    alexAudioChannel.hardStop();
    setVoiceFailed(false);

    const selectedIntent = intent || activeIntent;
    const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.first_name || null;
    const hour = new Date().getHours();
    const timeG = hour >= 5 && hour < 12 ? "Bonjour" : hour >= 12 && hour < 18 ? "Bon après-midi" : "Bonsoir";
    const hi = firstName ? `${timeG} ${firstName}!` : `${timeG}!`;
    const greetingMap: Record<IntentSlug, string> = {
      probleme: `${hi} Décrivez-moi votre problème ou envoyez une photo.`,
      projet: `${hi} Quel projet avez-vous en tête?`,
      avis: `${hi} Vous aimeriez que j'analyse vos soumissions?`,
    };
    start({ initialGreeting: greetingMap[selectedIntent], force: true });
    alexTranscriptRef.current = "";
    setLiveTranscript("");
    setPhase("speaking");
  }, [start, activeIntent, isPrimary, acquireLock, user]);

  const stopVoice = useCallback(() => {
    stop();
    releaseLock();
    setPhase("ready");
  }, [stop, releaseLock]);

  const retryVoice = useCallback(() => {
    stop();
    releaseLock();
    setVoiceFailed(false);
    setTimeout(() => triggerVoiceStart(), 300);
  }, [stop, releaseLock, triggerVoiceStart]);

  // ── Derived state ──
  const orbState = isConnecting && !voiceFailed ? "thinking" : isActive ? (isSpeaking ? "speaking" : "listening") : "idle";
  const voiceActive = isActive || (isConnecting && !voiceFailed);
  const current = INTENTS.find((i) => i.slug === activeIntent)!;

  // Phase-based visibility
  const showHeroText = phase === "arrival";
  const showLiveSurface = phase !== "arrival";
  const showPresenceLabel = phase === "presence" || phase === "speaking" || phase === "ready";
  const showVoiceControls = voiceActive;

  // Status text
  const presenceLabel =
    orbState === "speaking" ? "Alex vous parle…"
    : orbState === "listening" ? "Alex vous écoute…"
    : orbState === "thinking" ? "Connexion…"
    : voiceFailed ? "Touchez l'orb pour démarrer"
    : phase === "presence" ? "Alex en direct"
    : "Parlez à Alex";

  return (
    <>
      <section
        className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center overflow-hidden"
        data-testid="hero-section-alex"
      >
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

          {/* ═══ STATE 1: Hero text — dissolves away ═══ */}
          <AnimatePresence>
            {showHeroText && (
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="mb-6"
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
            )}
          </AnimatePresence>

          {/* ═══ Cinematic Voice Orb — ALWAYS visible from 0ms ═══ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0, type: "spring", stiffness: 200 }}
            className="mb-4 flex flex-col items-center"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer breathing glow */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 150, height: 150,
                  background: "radial-gradient(circle, hsl(222 100% 60% / 0.12) 0%, transparent 70%)",
                }}
                animate={{
                  scale: voiceActive ? [1, 1.2, 1] : [1, 1.08, 1],
                  opacity: voiceActive ? [0.4, 0.8, 0.4] : [0.3, 0.5, 0.3],
                }}
                transition={{ duration: voiceActive ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Ring */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 130, height: 130,
                  border: "1.5px solid hsl(222 100% 65% / 0.2)",
                  boxShadow: "0 0 40px hsl(222 100% 65% / 0.1)",
                }}
                animate={{ scale: voiceActive ? [1, 1.12, 1] : [1, 1.04, 1] }}
                transition={{ duration: voiceActive ? 1.2 : 2.5, repeat: Infinity, ease: "easeInOut" }}
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

              {/* Thinking spinner */}
              {orbState === "thinking" && (
                <motion.div className="absolute rounded-full pointer-events-none"
                  style={{ width: 130, height: 130, border: "2px dashed hsl(252 100% 70% / 0.2)" }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Main orb */}
              <motion.button
                onClick={() => voiceActive ? stopVoice() : (voiceFailed ? retryVoice() : startVoice())}
                className="relative rounded-full flex items-center justify-center overflow-hidden z-10"
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
                data-testid="alex-orb-button"
              >
                <div className="absolute inset-0 rounded-full" style={{
                  background: "radial-gradient(circle at 38% 32%, hsl(222 100% 75% / 0.35), transparent 60%)",
                }} />
                {orbState === "speaking" ? (
                  <Volume2 className="h-9 w-9 text-white/90 relative z-10" />
                ) : orbState === "thinking" ? (
                  <Loader2 className="h-9 w-9 text-white/90 relative z-10 animate-spin" />
                ) : (
                  <Mic className="h-9 w-9 text-white/90 relative z-10" />
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* ═══ STATE 3: Presence label + live transcript surface ═══ */}
          <AnimatePresence>
            {showLiveSurface && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm flex flex-col items-center gap-3 mb-5"
              >
                {/* Presence label */}
                {showPresenceLabel && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={presenceLabel}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-xs font-medium text-white/50"
                      >
                        {presenceLabel}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Live transcript surface — visible BEFORE speech starts */}
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.95 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="w-full rounded-2xl px-4 py-3 min-h-[52px] flex items-center"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {liveTranscript ? (
                    <p className="text-sm text-white/80 leading-relaxed">
                      <span className="text-white/40 text-xs mr-1.5">Alex :</span>
                      {liveTranscript}
                    </p>
                  ) : phase === "presence" ? (
                    <p className="text-sm text-white/30 italic">Alex prête…</p>
                  ) : phase === "speaking" && !liveTranscript ? (
                    <div className="flex items-center gap-2">
                      <motion.div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 h-1 rounded-full bg-white/40"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </motion.div>
                      <span className="text-xs text-white/30">Alex parle…</span>
                    </div>
                  ) : (
                    <p className="text-sm text-white/25 italic">{localGreeting}</p>
                  )}
                </motion.div>

                {/* Voice failed → fallback buttons */}
                <AnimatePresence>
                  {voiceFailed && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={retryVoice}
                        className="text-xs font-medium px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/15 transition-colors"
                      >
                        Réessayer
                      </button>
                      <button
                        onClick={() => setTextSheetOpen(true)}
                        className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/15 transition-colors"
                      >
                        <Keyboard className="h-3 w-3" /> Écrire à Alex
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Voice controls when active */}
                <AnimatePresence>
                  {showVoiceControls && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex items-center gap-2">
                      {orbState === "speaking" && (
                        <button onClick={stopVoice} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <VolumeX className="h-3 w-3" /> Couper
                        </button>
                      )}
                      <button onClick={() => { stopVoice(); setTextSheetOpen(true); }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <Keyboard className="h-3 w-3" /> Écrire
                      </button>
                      <button onClick={stopVoice} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-red-400/80 bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors">
                        <Square className="h-2.5 w-2.5" /> Arrêter
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Intent Pills ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mb-4 flex items-center gap-2"
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
                onClick={() => startVoice(activeIntent)}
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

              <button
                onClick={() => setTextSheetOpen(true)}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                <Keyboard className="h-3.5 w-3.5" />
                Écrire à Alex
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 z-20 pointer-events-none" style={{
          background: "linear-gradient(to top, hsl(228 40% 7%) 0%, transparent 100%)",
        }} />
      </section>

      <AlexAssistantSheet open={textSheetOpen} onClose={() => setTextSheetOpen(false)} />

      <UploadPhotoModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onFilesSelected={(files) => {
          console.log("[Hero] Files uploaded via modal:", files.length, files.map((f) => f.name));
        }}
      />
    </>
  );
}
