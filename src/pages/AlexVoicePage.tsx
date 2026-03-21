/**
 * AlexVoicePage — Premium voice-first UI for Alex
 * 
 * Full-screen immersive voice experience.
 * Feels like ChatGPT Voice or Perplexity Voice mode.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square, X, Send, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAlexVoiceFull, type VoiceState, type UIAction } from "@/hooks/useAlexVoice";
import { useAuth } from "@/hooks/useAuth";

// ─── Animated orb that reacts to voice state ───
function VoiceOrb({ state }: { state: VoiceState }) {
  const baseSize = state === "listening" ? 180 : state === "speaking" ? 160 : state === "thinking" ? 140 : 120;

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
          scale: state === "listening" ? [1, 1.08, 1] : state === "speaking" ? [1, 1.05, 1] : 1,
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
          scale: state === "speaking" ? [1, 1.04, 0.97, 1.02, 1] : state === "listening" ? [1, 1.06, 1] : 1,
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
                {[0, 1, 2].map(i => (
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
function StateLabel({ state }: { state: VoiceState }) {
  const labels: Record<VoiceState, string> = {
    idle: "Appuyez pour parler",
    listening: "Je vous écoute…",
    thinking: "Je réfléchis…",
    speaking: "Alex parle…",
  };

  return (
    <motion.p
      key={state}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-muted-foreground font-medium tracking-wide"
    >
      {labels[state]}
    </motion.p>
  );
}

export default function AlexVoicePage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleUIAction = useCallback((action: UIAction) => {
    switch (action.type) {
      case "navigate":
        if (action.target) navigate(action.target);
        break;
      case "open_upload":
        navigate("/dashboard/quotes/upload");
        break;
      case "show_score":
        navigate("/dashboard/home-score");
        break;
      case "show_pricing":
        navigate("/pricing");
        break;
      case "open_booking":
        navigate("/dashboard/booking");
        break;
    }
  }, [navigate]);

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
  } = useAlexVoice({
    onUIAction: handleUIAction,
    currentPage: pathname,
  });

  // Auto-start session on mount
  useEffect(() => {
    startSession();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleMicPress = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else if (state === "speaking") {
      stopPlayback();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening, stopPlayback]);

  const handleTextSend = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setTextInput("");
    sendMessage(trimmed);
  }, [textInput, sendMessage]);

  return (
    <>
      <Helmet>
        <title>Alex Voice — Concierge vocale | UNPRO</title>
        <meta name="description" content="Parlez directement à Alex, votre concierge vocale intelligente pour la maison et la rénovation." />
      </Helmet>

      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
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

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowText(!showText)}
              className="rounded-full"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle background gradient */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(ellipse at 50% 40%, hsl(var(--primary) / 0.08) 0%, transparent 60%)`,
            }}
          />

          {/* Conversation transcript (floating) */}
          <AnimatePresence>
            {messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-4 left-4 right-4 max-h-[30vh] overflow-y-auto rounded-2xl"
                ref={scrollRef}
              >
                <div className="space-y-2 p-3">
                  {messages.slice(-4).map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className={`text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "text-muted-foreground text-right"
                          : "text-foreground"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <span className="text-primary font-medium text-xs mr-1.5">Alex</span>
                      )}
                      {msg.content}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Orb */}
          <div className="relative z-10">
            <button
              onClick={handleMicPress}
              className="focus:outline-none cursor-pointer"
              disabled={state === "thinking"}
            >
              <VoiceOrb state={state} />
            </button>
          </div>

          {/* Live transcript */}
          <AnimatePresence>
            {transcript && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-sm text-foreground/80 italic max-w-xs text-center px-4"
              >
                "{transcript}"
              </motion.p>
            )}
          </AnimatePresence>

          {/* State label */}
          <div className="mt-6">
            <StateLabel state={state} />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-xs text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom controls */}
        <div className="px-4 pb-6 pt-2 space-y-3">
          {/* Text input toggle */}
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
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleTextSend()}
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

          {/* Action buttons */}
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

            <Button
              variant={state === "listening" ? "destructive" : "default"}
              size="lg"
              onClick={handleMicPress}
              disabled={state === "thinking" || !isSupported}
              className="rounded-full w-16 h-16 shadow-lg"
            >
              {state === "listening" ? (
                <Square className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>

            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="rounded-full"
              >
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
