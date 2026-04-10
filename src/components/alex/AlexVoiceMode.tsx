/**
 * UNPRO — Alex Voice Mode (Gemini Live Edition)
 * 
 * Uses useLiveVoice for the SAME Gemini Live voice as the hero orb.
 * Single voice pipeline — no separate TTS/STT.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, MessageSquare, X, Loader2, Volume2, Square } from "lucide-react";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { useAuth } from "@/hooks/useAuth";
import { smartConcatChunk, formatAlexTranscriptForDisplay } from "@/lib/alexTextFormatter";
import { audioEngine } from "@/services/audioEngineUNPRO";

interface AlexVoiceProps {
  feature: string;
  deepLinkId?: string;
  onFlowComplete: (context: Record<string, string>) => void;
  onDismiss: () => void;
  inline?: boolean;
  autoStart?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AlexVoiceMode({ feature, onFlowComplete, onDismiss, inline = false }: AlexVoiceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);

  const { start, stop, isActive, isConnecting, isSpeaking } = useLiveVoice({
    onTranscript: (text) => {
      // Alex speaking — accumulate assistant message with proper spacing
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 
            ? { ...m, content: smartConcatChunk(m.content, text) } 
            : m
          );
        }
        return [...prev, { role: "assistant", content: text }];
      });
    },
    onUserTranscript: (text) => {
      if (text.trim()) {
        setMessages(prev => [...prev, { role: "user", content: text }]);
      }
    },
    onConnect: () => {
      console.log("[AlexVoiceMode] Gemini Live connected");
    },
    onDisconnect: () => {
      console.log("[AlexVoiceMode] Gemini Live disconnected");
    },
    onError: (err) => {
      console.error("[AlexVoiceMode] Gemini Live error:", err);
    },
  });

  // Build greeting text
  const buildGreeting = useCallback(() => {
    const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.first_name || null;
    const hour = new Date().getHours();
    const timeGreeting = hour >= 5 && hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    const name = firstName ? `${timeGreeting} ${firstName}.` : `${timeGreeting}.`;

    switch (feature) {
      case "probleme":
        return `${name} Décrivez-moi votre problème, je m'en occupe.`;
      case "projet":
        return `${name} Un nouveau projet? Dites-moi de quoi il s'agit.`;
      case "avis":
        return `${name} Vous souhaitez que j'analyse vos soumissions? Décrivez-moi ce que vous avez reçu.`;
      case "intent":
      case "diagnostic":
        return `${name} Décrivez-moi votre besoin, je vous trouve le bon professionnel.`;
      default:
        return `${name} Que puis-je faire pour vous aujourd'hui?`;
    }
  }, [user, feature]);

  // Auto-start: unlock audio (we're in gesture context from button click),
  // play intro chime, WAIT for it to finish, then start Gemini with greeting.
  useEffect(() => {
    if (isActive || isConnecting) return;
    let cancelled = false;

    const launchSequence = async () => {
      // 1. Unlock audio engine (preserves gesture context)
      audioEngine.unlock();

      // 2. Play intro chime and wait for it to finish
      await audioEngine.play("intro");

      if (cancelled) return;

      // 3. Start Gemini Live — Alex speaks the greeting proactively
      const greeting = buildGreeting();
      start({ initialGreeting: greeting });
    };

    launchSequence();

    return () => {
      cancelled = true;
      audioEngine.play("outro");
      stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStop = useCallback(() => {
    stop();
    onDismiss();
  }, [stop, onDismiss]);

  const orbState = isConnecting ? "connecting" : isActive ? (isSpeaking ? "speaking" : "listening") : "idle";

  const statusText =
    orbState === "speaking" ? "Alex vous parle…"
    : orbState === "connecting" ? "Connexion…"
    : orbState === "listening" ? "Je vous écoute…"
    : "Parlez à Alex";

  return (
    <motion.div
      initial={{ opacity: 0, y: inline ? 10 : 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: inline ? -10 : 20 }}
      className={inline ? "w-full" : "fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)]"}
    >
      <div className={`relative backdrop-blur-xl border border-border/60 rounded-2xl shadow-[var(--shadow-2xl)] overflow-hidden ${inline ? "bg-card" : "bg-card/95"}`}
        style={{ maxHeight: inline ? undefined : "70vh" }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Volume2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-primary">Alex Voice</p>
              <p className="text-[9px] text-muted-foreground">{statusText}</p>
            </div>
          </div>
          <button onClick={handleStop} className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="max-h-48 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 && isConnecting && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-xs leading-relaxed px-3 py-2 rounded-xl max-w-[85%] ${
                msg.role === "user" ? "ml-auto bg-primary/10 text-foreground" : "bg-muted/50 text-foreground"
              }`}
            >
              {formatAlexTranscriptForDisplay(msg.content)}
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="p-3 border-t border-border/30">
          <div className="flex items-center justify-center gap-3">
            <motion.button
              onClick={isActive ? handleStop : () => start()}
              className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-gradient-to-br from-primary to-secondary text-primary-foreground"
              }`}
              animate={
                isSpeaking
                  ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0px hsl(var(--primary)/0)", "0 0 20px hsl(var(--primary)/0.4)", "0 0 0px hsl(var(--primary)/0)"] }
                  : isActive
                  ? { scale: [1, 1.04, 1] }
                  : {}
              }
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {isConnecting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isSpeaking ? (
                <Volume2 className="h-6 w-6" />
              ) : isActive ? (
                <Square className="h-5 w-5" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
