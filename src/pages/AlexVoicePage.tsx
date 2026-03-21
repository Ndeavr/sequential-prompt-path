/**
 * AlexVoicePage — Premium voice-first UI for Alex
 *
 * Full-screen immersive experience with:
 * - Hold-to-talk (press & hold mic)
 * - Animated VoiceOrb reacting to state
 * - Live transcript cards
 * - Quick action chips
 * - Optional contextual panels
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  X,
  Send,
  MessageCircle,
  Volume2,
  VolumeX,
  Camera,
  BarChart3,
  CalendarCheck,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAlexVoiceFull, type VoiceState, type UIAction } from "@/hooks/useAlexVoice";
import { useAuth } from "@/hooks/useAuth";
import { dispatchAlexActions, cleanupAlexOverlays, type AlexUIAction, type DispatcherDeps } from "@/lib/alexUiActionDispatcher";

// ─── Quick action chip data ───
const QUICK_ACTIONS = [
  { label: "Envoyer une photo", icon: Camera, action: "open_upload" },
  { label: "Voir mon score", icon: BarChart3, action: "show_score" },
  { label: "Prendre rendez-vous", icon: CalendarCheck, action: "open_booking" },
  { label: "Vérifier un entrepreneur", icon: ShieldCheck, action: "navigate", target: "/verifier-entrepreneur" },
];

// ─── Animated orb ───
function VoiceOrb({ state }: { state: VoiceState }) {
  const baseSize =
    state === "listening" ? 180 : state === "speaking" ? 160 : state === "thinking" ? 140 : 120;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Outer glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)`,
        }}
        animate={{
          width: baseSize + 80,
          height: baseSize + 80,
          opacity: state === "idle" ? 0.3 : 0.6,
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      {/* Mid ring */}
      <motion.div
        className="absolute rounded-full border border-primary/20"
        animate={{
          width: baseSize + 40,
          height: baseSize + 40,
          opacity: state === "listening" ? 0.8 : 0.4,
          scale:
            state === "listening"
              ? [1, 1.08, 1]
              : state === "speaking"
              ? [1, 1.05, 1]
              : 1,
        }}
        transition={{
          duration: state === "listening" ? 1.2 : state === "speaking" ? 0.8 : 0.6,
          repeat: state === "listening" || state === "speaking" ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Core orb */}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)`,
          boxShadow: `0 0 40px -8px hsl(var(--primary) / 0.4), 0 0 80px -16px hsl(var(--primary) / 0.2)`,
        }}
        animate={{
          width: baseSize,
          height: baseSize,
          scale:
            state === "speaking"
              ? [1, 1.04, 0.97, 1.02, 1]
              : state === "listening"
              ? [1, 1.06, 1]
              : 1,
        }}
        transition={{
          duration: state === "speaking" ? 0.6 : state === "listening" ? 1.5 : 0.4,
          repeat: state === "speaking" || state === "listening" ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        {/* Inner shimmer */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 35%, hsl(0 0% 100% / 0.2) 0%, transparent 60%)`,
          }}
        />

        {/* State icon */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {state === "listening" && <Mic className="w-10 h-10 text-primary-foreground" />}
            {state === "thinking" && (
              <motion.div
                className="flex gap-1.5"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-primary-foreground"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </motion.div>
            )}
            {state === "speaking" && <Volume2 className="w-10 h-10 text-primary-foreground" />}
            {state === "idle" && <Mic className="w-10 h-10 text-primary-foreground/60" />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── State label ───
function StateLabel({ state, holding }: { state: VoiceState; holding: boolean }) {
  const label =
    holding
      ? "Parlez maintenant…"
      : state === "idle"
      ? "Maintenez pour parler"
      : state === "listening"
      ? "Je vous écoute…"
      : state === "thinking"
      ? "Je réfléchis…"
      : "Alex parle…";

  return (
    <motion.p
      key={`${state}-${holding}`}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-muted-foreground font-medium tracking-wide"
    >
      {label}
    </motion.p>
  );
}

// ─── Transcript card ───
function TranscriptCard({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  if (!text) return null;
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl px-4 py-3 max-w-[85%] ${
        isUser
          ? "self-end bg-primary/10 text-foreground"
          : "self-start bg-card border border-border/60 text-foreground"
      }`}
    >
      {!isUser && (
        <span className="text-xs font-semibold text-primary mb-1 block">Alex</span>
      )}
      <p className="text-sm leading-relaxed">{text}</p>
    </motion.div>
  );
}

export default function AlexVoicePage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [holding, setHolding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup overlays on unmount
  useEffect(() => () => cleanupAlexOverlays(), []);

  const [dynamicChips, setDynamicChips] = useState<string[]>([]);

  const dispatcherDeps: DispatcherDeps = {
    navigate,
    onShowChips: (items) => setDynamicChips(items),
  };

  const handleUIAction = useCallback(
    (action: UIAction) => {
      dispatchAlexActions([action as AlexUIAction], dispatcherDeps);
    },
    [navigate]
  );

  const {
    state,
    messages,
    transcript,
    error,
    isSupported,
    startSession,
    sendMessage,
    startListening,
    stopListening,
    stopPlayback,
    interrupt,
    reset,
  } = useAlexVoiceFull({
    onUIAction: handleUIAction,
    currentPage: pathname,
  });

  // Auto-start session on mount
  useEffect(() => {
    startSession();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Hold-to-talk handlers ───
  const handlePointerDown = useCallback(() => {
    if (!isSupported || state === "thinking") return;

    // Interrupt Alex if speaking
    if (state === "speaking") {
      stopPlayback();
    }

    holdTimerRef.current = setTimeout(() => {
      setHolding(true);
      startListening();
    }, 120); // Short debounce to avoid accidental taps
  }, [state, isSupported, startListening, stopPlayback]);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (holding) {
      setHolding(false);
      stopListening();
    }
  }, [holding, stopListening]);

  // Cancel hold on pointer leave
  const handlePointerLeave = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  // Tap action (non-hold)
  const handleTap = useCallback(() => {
    if (state === "speaking") {
      stopPlayback();
    } else if (state === "listening") {
      stopListening();
    }
  }, [state, stopPlayback, stopListening]);

  const handleTextSend = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setTextInput("");
    sendMessage(trimmed);
  }, [textInput, sendMessage]);

  const handleChipAction = useCallback(
    (chip: (typeof QUICK_ACTIONS)[0]) => {
      handleUIAction({ type: chip.action, target: chip.target } as UIAction);
    },
    [handleUIAction]
  );

  return (
    <>
      <Helmet>
        <title>Alex Voice — Concierge vocale | UNPRO</title>
        <meta
          name="description"
          content="Parlez directement à Alex, votre concierge vocale intelligente pour la maison et la rénovation."
        />
      </Helmet>

      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold text-foreground font-display">Alex</h1>
              <p className="text-xs text-muted-foreground">Concierge vocale</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowText((v) => !v)}
              className="rounded-full"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ─── Main area ─── */}
        <div className="flex-1 flex flex-col items-center justify-between relative overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 40%, hsl(var(--primary) / 0.08) 0%, transparent 60%)`,
            }}
          />

          {/* ─── Conversation cards ─── */}
          <div
            ref={scrollRef}
            className="w-full max-w-md flex-shrink-0 max-h-[28vh] overflow-y-auto px-4 pt-4 relative z-10"
          >
            <div className="flex flex-col gap-2">
              {messages.slice(-6).map((msg, i) => (
                <TranscriptCard key={i} role={msg.role} text={msg.content} />
              ))}
            </div>
          </div>

          {/* ─── Orb center ─── */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-0">
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onClick={handleTap}
              className="focus:outline-none cursor-pointer select-none touch-none"
              disabled={state === "thinking"}
              aria-label="Maintenez pour parler"
            >
              <VoiceOrb state={holding ? "listening" : state} />
            </button>

            {/* Live transcript preview */}
            <AnimatePresence>
              {transcript && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-sm text-foreground/70 italic max-w-xs text-center px-4"
                >
                  &ldquo;{transcript}&rdquo;
                </motion.p>
              )}
            </AnimatePresence>

            {/* State label */}
            <div className="mt-4">
              <StateLabel state={state} holding={holding} />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 text-xs text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Quick action chips ─── */}
          <div className="w-full px-4 pb-2 relative z-10">
            <AnimatePresence>
              {state === "idle" && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="flex flex-wrap justify-center gap-2"
                >
                  {QUICK_ACTIONS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleChipAction(chip)}
                      className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent/10 hover:border-primary/30 active:scale-95"
                    >
                      <chip.icon className="w-3.5 h-3.5 text-primary" />
                      {chip.label}
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── Bottom controls ─── */}
        <div className="px-4 pb-6 pt-2 space-y-3 border-t border-border/20">
          {/* Text input */}
          <AnimatePresence>
            {showText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2"
              >
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
                  placeholder="Écrire à Alex…"
                  className="flex-1 rounded-full bg-muted/50"
                  disabled={state === "thinking"}
                />
                <Button
                  size="icon"
                  onClick={handleTextSend}
                  disabled={!textInput.trim() || state === "thinking"}
                  className="rounded-full"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action row */}
          <div className="flex items-center justify-center gap-4">
            {state === "speaking" && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopPlayback}
                className="rounded-full gap-2"
              >
                <VolumeX className="w-4 h-4" />
                Arrêter
              </Button>
            )}

            <div className="flex flex-col items-center gap-1">
              <Button
                variant={state === "listening" || holding ? "destructive" : "default"}
                size="lg"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                disabled={state === "thinking" || !isSupported}
                className="rounded-full w-16 h-16 shadow-lg"
                aria-label="Maintenez pour parler"
              >
                {state === "listening" || holding ? (
                  <Square className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
              <span className="text-[10px] text-muted-foreground">
                {holding ? "Relâchez" : "Maintenez"}
              </span>
            </div>

            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={reset} className="rounded-full">
                Nouveau
              </Button>
            )}
          </div>

          {!isSupported && (
            <p className="text-xs text-center text-muted-foreground">
              La reconnaissance vocale nécessite Chrome ou Safari.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
