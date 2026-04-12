/**
 * AlexVoiceRealtime — Gemini Live real-time voice with proper boot sequence.
 * 
 * Uses useAlexVoiceBootstrap for the strict sequence:
 * intro sound → connect → greeting → listen.
 * Single primary control. No infinite spinners.
 */
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Phone, PhoneOff, Sparkles, Volume2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexVoiceBootstrap, type VoiceBootState } from "@/hooks/useAlexVoiceBootstrap";
import UnproIcon from "@/components/brand/UnproIcon";

interface AlexVoiceRealtimeProps {
  agentId?: string;
  onClose?: () => void;
  userName?: string;
  className?: string;
}

export default function AlexVoiceRealtime({ onClose, userName, className = "" }: AlexVoiceRealtimeProps) {
  const {
    bootState,
    transcripts,
    errorMessage,
    primaryControl,
    statusText,
    isSpeaking,
    isActive,
    startVoice,
    stopVoice,
    retryVoice,
  } = useAlexVoiceBootstrap({ feature: "general" });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Listen for global cleanup — but NOT if locked overlay manages this
  useEffect(() => {
    const handleCleanup = () => {
      // This will only fire if the locked overlay didn't intercept it
      if (isActive) stopVoice();
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    return () => window.removeEventListener("alex-voice-cleanup", handleCleanup);
  }, [isActive, stopVoice]);

  const handlePrimaryAction = () => {
    switch (primaryControl) {
      case "start": startVoice(); break;
      case "stop": stopVoice(); break;
      case "retry":
      case "permission": retryVoice(); break;
    }
  };

  const handleClose = () => {
    stopVoice();
    onClose?.();
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 bg-card/60">
                <img src={logo} alt="Alex" className="w-full h-full object-contain" />
              </div>
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground font-display">Alex Voice</h2>
              <p className="text-[10px] text-muted-foreground">{statusText}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Aura background */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 40%, hsl(var(--primary) / 0.08) 0%, transparent 60%)`,
          }}
        />

        {/* Transcripts */}
        <div
          ref={scrollRef}
          className="w-full max-w-md flex-shrink-0 max-h-[30vh] overflow-y-auto px-4 pt-4 relative z-10"
        >
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {transcripts.slice(-8).map(entry => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                    entry.role === "user"
                      ? "self-end bg-primary/10 text-foreground"
                      : "self-start bg-card border border-border/60 text-foreground"
                  }`}
                >
                  {entry.role === "alex" && (
                    <span className="text-xs font-semibold text-primary mb-1 block">Alex</span>
                  )}
                  <p className="text-sm leading-relaxed">{entry.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Voice Orb */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-0">
          <VoiceOrb state={bootState} isSpeaking={isSpeaking} />

          <motion.p
            key={statusText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-muted-foreground font-medium tracking-wide"
          >
            {statusText}
          </motion.p>

          {isActive && (
            <p className="mt-1 text-[10px] text-muted-foreground/60 tracking-wider uppercase">
              Native Audio • Temps réel
            </p>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-20 left-4 right-4 mx-auto max-w-sm flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-xs z-20"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Single Bottom Control */}
      <div className="px-4 pb-6 pt-3 flex items-center justify-center gap-4 border-t border-border/20">
        <Button
          onClick={handlePrimaryAction}
          disabled={primaryControl === "connecting"}
          size="lg"
          variant={primaryControl === "stop" ? "destructive" : "default"}
          className={`rounded-full gap-2 px-8 ${
            primaryControl === "start"
              ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-[var(--shadow-glow)]"
              : ""
          }`}
        >
          {primaryControl === "start" && <><Phone className="w-5 h-5" />Parler à Alex</>}
          {primaryControl === "stop" && <><PhoneOff className="w-5 h-5" />Raccrocher</>}
          {primaryControl === "retry" && <><RefreshCw className="w-5 h-5" />Réessayer</>}
          {primaryControl === "permission" && <><Mic className="w-5 h-5" />Autoriser le micro</>}
          {primaryControl === "connecting" && <><Sparkles className="w-5 h-5 animate-spin" />Connexion…</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Animated Voice Orb ───
function VoiceOrb({ state, isSpeaking }: { state: VoiceBootState; isSpeaking: boolean }) {
  const isActive = ["alex_speaking", "alex_listening", "user_speaking", "processing", "alex_speaking_response"].includes(state);
  const isConnecting = ["preloading", "connecting", "intro_playing"].includes(state);
  const isError = state === "session_error" || state === "permission_check";

  const baseSize = isActive ? (isSpeaking ? 170 : 160) : isConnecting ? 140 : 120;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Outer glow */}
      <motion.div
        animate={{
          scale: isActive ? (isSpeaking ? [1, 1.2, 1] : [1, 1.15, 1]) : 1,
          opacity: isActive ? 0.4 : 0.15,
        }}
        transition={{
          duration: isSpeaking ? 0.8 : 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute rounded-full"
        style={{
          width: baseSize + 80,
          height: baseSize + 80,
          background: `radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)`,
        }}
      />

      {/* Middle ring */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.08, 1] : isActive ? [1, 1.05, 1] : 1,
          borderColor: isActive ? "hsl(var(--primary) / 0.3)" : "hsl(var(--muted-foreground) / 0.15)",
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full border"
        style={{ width: baseSize + 40, height: baseSize + 40 }}
      />

      {/* Core orb */}
      <motion.div
        animate={{
          width: baseSize,
          height: baseSize,
          scale: isConnecting ? [1, 0.92, 1] : isSpeaking ? [1, 1.05, 1] : 1,
        }}
        transition={{
          width: { type: "spring", stiffness: 200, damping: 20 },
          height: { type: "spring", stiffness: 200, damping: 20 },
          scale: { duration: isConnecting ? 0.6 : 0.8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: isError
            ? `radial-gradient(circle at 35% 35%, hsl(var(--destructive) / 0.6), hsl(var(--destructive) / 0.3))`
            : isActive
            ? `radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.6))`
            : `radial-gradient(circle at 35% 35%, hsl(var(--muted-foreground) / 0.4), hsl(var(--muted-foreground) / 0.2))`,
          boxShadow: `0 0 ${isActive ? 40 : 15}px hsl(var(--primary) / ${isActive ? 0.3 : 0.1})`,
        }}
      >
        <AnimatePresence mode="wait">
          {isActive && !isSpeaking && (
            <motion.div key="listening" initial={{ scale: 0 }} animate={{ scale: [1, 1.15, 1] }} exit={{ scale: 0 }} transition={{ scale: { duration: 1.2, repeat: Infinity } }}>
              <Mic className="w-10 h-10 text-primary-foreground" />
            </motion.div>
          )}
          {isActive && isSpeaking && (
            <motion.div key="speaking" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map(i => (
                  <motion.div key={i} animate={{ height: [6, 22, 6] }} transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }} className="w-1.5 bg-primary-foreground rounded-full" />
                ))}
              </div>
            </motion.div>
          )}
          {isConnecting && (
            <motion.div key="connecting" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-9 h-9 text-primary-foreground/80" />
            </motion.div>
          )}
          {isError && (
            <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <AlertCircle className="w-9 h-9 text-destructive-foreground" />
            </motion.div>
          )}
          {state === "idle" && (
            <motion.div key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Mic className="w-10 h-10 text-primary-foreground/50" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
