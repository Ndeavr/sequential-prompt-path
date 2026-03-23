/**
 * UNPRO — Alex Voice Mode
 * Real-time voice interaction with STT + TTS.
 * Alex ENGAGES the conversation first with a greeting, then auto-listens.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, MessageSquare, X, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlexVoiceProps {
  feature: string;
  deepLinkId?: string;
  onFlowComplete: (context: Record<string, string>) => void;
  onDismiss: () => void;
  /** Render inline (inside a card) instead of fixed floating */
  inline?: boolean;
  /** Auto-start listening on mount (legacy, greeting now handles this) */
  autoStart?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AlexVoiceMode({ feature, deepLinkId, onFlowComplete, onDismiss, inline = false, autoStart = false }: AlexVoiceProps) {
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [greetingDone, setGreetingDone] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const greetingAttempted = useRef(false);

  // Create session on mount — greeting is handled in a separate effect
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("alex-voice", {
          body: { action: "create-session", feature },
        });
        if (data?.sessionId) {
          setSessionId(data.sessionId);

          // Play greeting audio + display greeting text immediately
          if (data.greeting) {
            setMessages([{ role: "assistant", content: data.greeting }]);
          }
          if (data.greetingAudio) {
            playGreetingAudio(data.greetingAudio);
          } else {
            // No audio — just mark greeting done and start listening
            setGreetingDone(true);
          }
        }
      } catch {
        // Fallback greeting if backend fails
        setMessages([{ role: "assistant", content: "Bonjour! Comment puis-je vous aider?" }]);
        setGreetingDone(true);
      }
    })();
  }, [feature]);

  // Auto-start listening after greeting finishes
  useEffect(() => {
    if (greetingDone && sessionId && mode === "voice") {
      const timer = setTimeout(() => startListening(), 300);
      return () => clearTimeout(timer);
    }
  }, [greetingDone, sessionId, mode]);

  // Play greeting audio, then trigger listening
  const playGreetingAudio = useCallback((base64Audio: string) => {
    try {
      setIsSpeaking(true);
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        setGreetingDone(true);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setGreetingDone(true);
      };
      audio.play().catch(() => {
        // Autoplay blocked — mark done so user can manually interact
        setIsSpeaking(false);
        setGreetingDone(true);
      });
    } catch {
      setIsSpeaking(false);
      setGreetingDone(true);
    }
  }, []);

  // Speech recognition setup
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("La reconnaissance vocale n'est pas supportée par ce navigateur");
      setMode("text");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-CA";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) {
        handleUserMessage(final);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Play response audio chunks sequentially
  const playAudioChunks = useCallback((chunks: string[], onDone: () => void) => {
    let index = 0;
    const playNext = () => {
      if (index >= chunks.length) {
        onDone();
        return;
      }
      const audioUrl = `data:audio/mpeg;base64,${chunks[index]}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        index++;
        playNext();
      };
      audio.onerror = () => {
        index++;
        playNext();
      };
      audio.play().catch(() => {
        index++;
        playNext();
      });
    };
    playNext();
  }, []);

  // Send message to Alex and get voice response
  const handleUserMessage = useCallback(async (text: string) => {
    setIsProcessing(true);
    setTranscript("");
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "respond",
            sessionId,
            feature,
            userMessage: text,
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (response.status === 429) {
        toast.error("Trop de requêtes, réessaie dans quelques secondes");
        setIsProcessing(false);
        return;
      }
      if (response.status === 402) {
        toast.error("Crédit insuffisant");
        setIsProcessing(false);
        return;
      }

      const data = await response.json();

      if (data.text) {
        setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
      }

      // Play audio chunks if available
      if (data.audioAvailable && data.audioChunks?.length && mode === "voice") {
        setIsSpeaking(true);
        playAudioChunks(data.audioChunks, () => {
          setIsSpeaking(false);
          if (mode === "voice") {
            setTimeout(() => startListening(), 300);
          }
        });
      } else if (data.audioAvailable && data.audio && mode === "voice") {
        // Legacy single audio field
        setIsSpeaking(true);
        const audioUrl = `data:audio/mpeg;base64,${data.audio}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          if (mode === "voice") {
            setTimeout(() => startListening(), 300);
          }
        };
        await audio.play();
      }
    } catch (e) {
      console.error("Voice error:", e);
      toast.error("Erreur de communication");
    } finally {
      setIsProcessing(false);
    }
  }, [messages, sessionId, feature, mode, startListening, playAudioChunks]);

  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleUserMessage(textInput.trim());
    setTextInput("");
  }, [textInput, handleUserMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: inline ? 10 : 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: inline ? -10 : 20 }}
      className={inline
        ? "w-full"
        : "fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)]"
      }
    >
      <div className={`relative backdrop-blur-xl border border-border/60 rounded-2xl shadow-[var(--shadow-2xl)] overflow-hidden ${inline ? "bg-card" : "bg-card/95"}`}>
        {/* Top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Volume2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-primary">Alex Voice</p>
              <p className="text-[9px] text-muted-foreground">
                {isSpeaking ? "Alex parle..." : isListening ? "Écoute..." : isProcessing ? "Réfléchit..." : greetingDone ? "À vous" : "Connexion..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode(m => m === "voice" ? "text" : "voice")}
              className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              {mode === "voice" ? <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> : <Mic className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button onClick={onDismiss} className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="max-h-48 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 && !greetingDone && (
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
                msg.role === "user"
                  ? "ml-auto bg-primary/10 text-foreground"
                  : "bg-muted/50 text-foreground"
              }`}
            >
              {msg.content}
            </motion.div>
          ))}

          {/* Live transcript */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-xs text-muted-foreground italic px-3 py-1"
            >
              {transcript}...
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="p-3 border-t border-border/30">
          {mode === "voice" ? (
            <div className="flex items-center justify-center">
              <motion.button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || isSpeaking}
                className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-gradient-to-br from-primary to-secondary text-primary-foreground"
                }`}
                animate={
                  isListening
                    ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0px hsl(var(--primary)/0)", "0 0 20px hsl(var(--primary)/0.4)", "0 0 0px hsl(var(--primary)/0)"] }
                    : isSpeaking
                    ? { scale: [1, 1.04, 1] }
                    : {}
                }
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isSpeaking ? (
                  <Volume2 className="h-6 w-6" />
                ) : isListening ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </motion.button>
            </div>
          ) : (
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Écris ton message..."
                className="flex-1 text-xs bg-muted/50 border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary/50"
                disabled={isProcessing}
              />
              <Button size="sm" type="submit" disabled={isProcessing || !textInput.trim()} className="rounded-xl">
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "→"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}
