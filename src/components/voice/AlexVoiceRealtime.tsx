/**
 * AlexVoiceRealtime — Gemini Live (Native Audio) powered real-time voice
 * 
 * PRIMARY: Gemini Live Native Audio (ultra-low latency bidirectional)
 * No ElevenLabs dependency — Gemini handles voice natively.
 * 
 * Full bidirectional voice: user speaks → AI listens → AI responds in real-time
 * No sequential TTS. True real-time conversation via WebSockets.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Phone, PhoneOff, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { filterPublicOutput } from "@/hooks/useAlexPublicOutputFilter";
import logo from "@/assets/unpro-robot.png";

interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  id: string;
}

interface AlexVoiceRealtimeProps {
  agentId?: string;
  onClose?: () => void;
  userName?: string;
  className?: string;
}

export default function AlexVoiceRealtime({ onClose, userName, className = "" }: AlexVoiceRealtimeProps) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);
  const lastAgentIdRef = useRef<string | null>(null);

  const { start, stop, isActive, isConnecting, isSpeaking } = useLiveVoice({
    onTranscript: (text) => {
      // Accumulate agent text into the latest agent entry
      setTranscripts((prev) => {
        const lastAgent = prev.length > 0 && prev[prev.length - 1].role === "agent"
          ? prev[prev.length - 1]
          : null;

        if (lastAgent && lastAgent.id === lastAgentIdRef.current) {
          return prev.map((e) =>
            e.id === lastAgent.id ? { ...e, text: e.text + text } : e
          );
        }

        const newId = `agent-${++entryIdRef.current}`;
        lastAgentIdRef.current = newId;
        return [...prev, { role: "agent", text, id: newId }];
      });
    },
    onUserTranscript: (text) => {
      lastAgentIdRef.current = null; // Reset so next agent text creates new entry
      setTranscripts((prev) => [
        ...prev,
        { role: "user", text, id: `user-${++entryIdRef.current}` },
      ]);
    },
    onConnect: () => {
      toast.success("Alex est connectée", { duration: 2000 });
    },
    onDisconnect: () => {
      // Silent disconnect
    },
    onError: (error) => {
      console.error("[AlexVoice] Gemini Live error:", error);
      toast.error("Erreur de connexion vocale. Réessayez.");
    },
  });

  // Auto-scroll transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Listen for global cleanup
  useEffect(() => {
    const handleCleanup = () => {
      if (isActive) stop();
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    return () => window.removeEventListener("alex-voice-cleanup", handleCleanup);
  }, [isActive, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  const startConversation = useCallback(async () => {
    // Kill ALL other voice sources before starting
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
    await new Promise((r) => setTimeout(r, 50));
    setTranscripts([]);
    lastAgentIdRef.current = null;
    await start();
  }, [start]);

  const stopConversation = useCallback(() => {
    stop();
  }, [stop]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    // Note: muting is handled by stopping/resuming the mic stream
    // For now, visual indicator only — Gemini Live handles VAD
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
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
              <p className="text-[10px] text-muted-foreground">
                {isActive
                  ? isSpeaking
                    ? "Parle…"
                    : "Écoute…"
                  : isConnecting
                  ? "Connexion Gemini Live…"
                  : "Hors ligne"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isActive && (
            <Button variant="ghost" size="icon" onClick={toggleMute} className="rounded-full">
              {isMuted ? (
                <MicOff className="w-4 h-4 text-destructive" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          )}
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
              {transcripts.slice(-8).map((entry) => (
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
                  {entry.role === "agent" && (
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
          <VoiceOrb
            isConnected={isActive}
            isSpeaking={isSpeaking}
            isConnecting={isConnecting}
          />

          <motion.p
            key={isActive ? (isSpeaking ? "speaking" : "listening") : "idle"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-muted-foreground font-medium tracking-wide"
          >
            {isConnecting
              ? "Connexion Gemini Live…"
              : isActive
              ? isSpeaking
                ? "Alex parle…"
                : "Je vous écoute…"
              : "Appuyez pour démarrer"}
          </motion.p>

          {isActive && (
            <p className="mt-1 text-[10px] text-muted-foreground/60 tracking-wider uppercase">
              Native Audio • Temps réel
            </p>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-4 pb-6 pt-3 flex items-center justify-center gap-4 border-t border-border/20">
        {!isActive ? (
          <Button
            onClick={startConversation}
            disabled={isConnecting}
            size="lg"
            className="rounded-full gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground px-8 shadow-[var(--shadow-glow)]"
          >
            <Phone className="w-5 h-5" />
            {isConnecting ? "Connexion…" : "Parler à Alex"}
          </Button>
        ) : (
          <Button
            onClick={stopConversation}
            size="lg"
            variant="destructive"
            className="rounded-full gap-2 px-8"
          >
            <PhoneOff className="w-5 h-5" />
            Raccrocher
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Animated Voice Orb ───
function VoiceOrb({
  isConnected,
  isSpeaking,
  isConnecting,
}: {
  isConnected: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
}) {
  const state = isConnecting
    ? "connecting"
    : isConnected
    ? isSpeaking
      ? "speaking"
      : "listening"
    : "idle";
  const baseSize =
    state === "listening"
      ? 160
      : state === "speaking"
      ? 170
      : state === "connecting"
      ? 140
      : 120;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 220, height: 220 }}
    >
      {/* Outer glow */}
      <motion.div
        animate={{
          scale:
            state === "listening"
              ? [1, 1.15, 1]
              : state === "speaking"
              ? [1, 1.2, 1]
              : 1,
          opacity: state === "idle" ? 0.15 : 0.4,
        }}
        transition={{
          duration:
            state === "listening" ? 1.5 : state === "speaking" ? 0.8 : 3,
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
          scale:
            state === "speaking"
              ? [1, 1.08, 1]
              : state === "listening"
              ? [1, 1.05, 1]
              : 1,
          borderColor: isConnected
            ? "hsl(var(--primary) / 0.3)"
            : "hsl(var(--muted-foreground) / 0.15)",
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
          scale:
            state === "connecting"
              ? [1, 0.92, 1]
              : state === "speaking"
              ? [1, 1.05, 1]
              : 1,
        }}
        transition={{
          width: { type: "spring", stiffness: 200, damping: 20 },
          height: { type: "spring", stiffness: 200, damping: 20 },
          scale: {
            duration: state === "connecting" ? 0.6 : 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: isConnected
            ? `radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.6))`
            : `radial-gradient(circle at 35% 35%, hsl(var(--muted-foreground) / 0.4), hsl(var(--muted-foreground) / 0.2))`,
          boxShadow: `0 0 ${isConnected ? 40 : 15}px hsl(var(--primary) / ${
            isConnected ? 0.3 : 0.1
          })`,
        }}
      >
        <AnimatePresence mode="wait">
          {state === "listening" && (
            <motion.div
              key="listening"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.15, 1] }}
              exit={{ scale: 0 }}
              transition={{ scale: { duration: 1.2, repeat: Infinity } }}
            >
              <Mic className="w-10 h-10 text-primary-foreground" />
            </motion.div>
          )}
          {state === "speaking" && (
            <motion.div
              key="speaking"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [6, 22, 6] }}
                    transition={{
                      duration: 0.4,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                    className="w-1.5 bg-primary-foreground rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
          {state === "connecting" && (
            <motion.div
              key="connecting"
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Sparkles className="w-9 h-9 text-primary-foreground/80" />
            </motion.div>
          )}
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Mic className="w-10 h-10 text-primary-foreground/50" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
