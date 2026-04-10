/**
 * PanelAlexVoiceSurface — Unified voice conversation surface.
 * 
 * Renders: orb + status + transcripts + single primary control.
 * No duplicate controls. No infinite spinners (timeout → retry).
 * Greeting BEFORE listening. Premium mobile-first UX.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Phone, PhoneOff, Sparkles, Volume2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexVoiceBootstrap, type VoiceBootState } from "@/hooks/useAlexVoiceBootstrap";
import { useRef, useEffect } from "react";

interface PanelAlexVoiceSurfaceProps {
  feature?: string;
  onClose?: () => void;
  compact?: boolean;
}

export default function PanelAlexVoiceSurface({ feature = "general", onClose, compact = false }: PanelAlexVoiceSurfaceProps) {
  const {
    bootState,
    transcripts,
    errorMessage,
    primaryControl,
    statusText,
    isSpeaking,
    startVoice,
    stopVoice,
    retryVoice,
  } = useAlexVoiceBootstrap({ feature });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

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
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"} items-center w-full`}>
      {/* Voice Orb */}
      <VoiceOrb state={bootState} isSpeaking={isSpeaking} />

      {/* Status */}
      <motion.p
        key={statusText}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-medium text-muted-foreground tracking-wide"
      >
        {statusText}
      </motion.p>

      {/* Error message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs max-w-xs text-center"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcripts */}
      {transcripts.length > 0 && (
        <div
          ref={scrollRef}
          className="w-full max-w-sm max-h-40 overflow-y-auto space-y-2 px-2"
          style={{ scrollbarWidth: "none" }}
        >
          <AnimatePresence>
            {transcripts.slice(-6).map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-[85%] ${
                  entry.role === "user"
                    ? "ml-auto bg-primary/10 text-foreground"
                    : "bg-card border border-border/40 text-foreground"
                }`}
              >
                {entry.role === "alex" && (
                  <span className="text-[10px] font-semibold text-primary block mb-0.5">Alex</span>
                )}
                {entry.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Single Primary Control */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handlePrimaryAction}
          disabled={primaryControl === "connecting"}
          size="lg"
          variant={primaryControl === "stop" ? "destructive" : "default"}
          className={`rounded-full gap-2 px-6 ${
            primaryControl === "start" 
              ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-[var(--shadow-glow)]"
              : ""
          }`}
        >
          {primaryControl === "start" && <><Phone className="w-4 h-4" />Parler à Alex</>}
          {primaryControl === "stop" && <><PhoneOff className="w-4 h-4" />Raccrocher</>}
          {primaryControl === "retry" && <><RefreshCw className="w-4 h-4" />Réessayer</>}
          {primaryControl === "permission" && <><Mic className="w-4 h-4" />Autoriser le micro</>}
          {primaryControl === "connecting" && <><Sparkles className="w-4 h-4 animate-spin" />Connexion…</>}
        </Button>

        {/* Close button when active */}
        {onClose && bootState !== "idle" && (
          <Button variant="ghost" size="sm" onClick={handleClose} className="rounded-full text-xs text-muted-foreground">
            Fermer
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Animated Voice Orb ───
function VoiceOrb({ state, isSpeaking }: { state: VoiceBootState; isSpeaking: boolean }) {
  const isActive = ["alex_speaking", "alex_listening", "user_speaking", "processing", "alex_speaking_response"].includes(state);
  const isConnecting = ["preloading", "connecting", "intro_playing"].includes(state);
  const isError = state === "session_error" || state === "permission_check";

  const baseSize = isActive ? (isSpeaking ? 130 : 120) : isConnecting ? 110 : 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* Outer glow */}
      <motion.div
        animate={{
          scale: isActive ? (isSpeaking ? [1, 1.2, 1] : [1, 1.1, 1]) : 1,
          opacity: isActive ? 0.4 : 0.15,
        }}
        transition={{
          duration: isSpeaking ? 0.8 : 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute rounded-full"
        style={{
          width: baseSize + 60,
          height: baseSize + 60,
          background: `radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)`,
        }}
      />

      {/* Core orb */}
      <motion.div
        animate={{
          width: baseSize,
          height: baseSize,
          scale: isConnecting ? [1, 0.94, 1] : isSpeaking ? [1, 1.06, 1] : 1,
        }}
        transition={{
          width: { type: "spring", stiffness: 200, damping: 20 },
          height: { type: "spring", stiffness: 200, damping: 20 },
          scale: { duration: isConnecting ? 0.6 : 0.8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="rounded-full flex items-center justify-center shadow-xl"
        style={{
          background: isError
            ? `radial-gradient(circle at 35% 35%, hsl(var(--destructive) / 0.6), hsl(var(--destructive) / 0.3))`
            : isActive
            ? `radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.5))`
            : `radial-gradient(circle at 35% 35%, hsl(var(--muted-foreground) / 0.3), hsl(var(--muted-foreground) / 0.15))`,
          boxShadow: isActive ? `0 0 30px hsl(var(--primary) / 0.25)` : "none",
        }}
      >
        <AnimatePresence mode="wait">
          {isConnecting && (
            <motion.div key="conn" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-8 h-8 text-primary-foreground/80" />
            </motion.div>
          )}
          {isSpeaking && isActive && (
            <motion.div key="speak" className="flex items-center gap-1">
              {[0, 1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [5, 20, 5] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1.5 bg-primary-foreground rounded-full"
                />
              ))}
            </motion.div>
          )}
          {!isSpeaking && isActive && (
            <motion.div key="listen" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
              <Mic className="w-8 h-8 text-primary-foreground" />
            </motion.div>
          )}
          {isError && (
            <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <AlertCircle className="w-8 h-8 text-destructive-foreground" />
            </motion.div>
          )}
          {state === "idle" && (
            <motion.div key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Mic className="w-8 h-8 text-primary-foreground/40" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
