/**
 * AlexAssistantSheet — Text-first chat sheet + optional voice mode.
 * Uses useAlexVoiceSession for stable voice, useAlex for text-only chat.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Mic, Keyboard, Send, Loader2, Square, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlex } from "@/hooks/useAlex";
import { useAlexVoiceSession } from "@/hooks/useAlexVoiceSession";
import { useAuth } from "@/hooks/useAuth";

type Mode = "text" | "voice";

const DEFAULT_SUGGESTIONS = [
  "Rénover ma cuisine",
  "Réparer ma toiture",
  "Obtenir un certificat de localisation",
  "Agrandir ma maison",
];

const CHIP_SUGGESTIONS: Record<string, string[]> = {
  "Rénovation": ["Rénover ma cuisine", "Rénover ma salle de bain", "Rénover mon sous-sol", "Trouver un entrepreneur général"],
  "Construction": ["Construire un garage", "Construire une maison neuve", "Trouver un entrepreneur général"],
  "Agrandissement": ["Agrandir ma maison", "Ajouter un étage", "Construire une extension"],
  "Toiture": ["Réparer ma toiture", "Remplacer mon toit", "Trouver un couvreur"],
  "Cuisine": ["Rénover ma cuisine", "Refaire les armoires", "Installer un îlot"],
};

const CHIP_GREETINGS: Record<string, string> = {
  "Rénovation": "vous cherchez à rénover ?",
  "Construction": "vous cherchez à construire ?",
  "Agrandissement": "vous pensez agrandir votre maison ?",
  "Toiture": "vous avez un projet de toiture ?",
  "Cuisine": "vous voulez refaire votre cuisine ?",
  "Électricité": "vous avez besoin d'un électricien ?",
  "Plomberie": "vous cherchez un plombier ?",
};

interface Props {
  open: boolean;
  onClose: () => void;
  initialChip?: string;
}

export default function AlexAssistantSheet({ open, onClose, initialChip }: Props) {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("text");
  const [input, setInput] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [chipContext, setChipContext] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";
  const greeting = firstName ? `Bonjour ${firstName}.` : "Bonjour.";
  const chipGreeting = chipContext
    ? `${greeting.replace(".", ",")} ${CHIP_GREETINGS[chipContext] || `vous avez un projet de ${chipContext.toLowerCase()} ?`}`
    : undefined;
  const suggestions = chipContext
    ? (CHIP_SUGGESTIONS[chipContext] || DEFAULT_SUGGESTIONS)
    : DEFAULT_SUGGESTIONS;

  // Text-mode chat
  const textChat = useAlex();

  // Voice-mode session
  const voiceSession = useAlexVoiceSession();

  // Active messages depend on mode
  const messages = mode === "voice" ? voiceSession.messages : textChat.messages;
  const isStreaming = mode === "voice" ? voiceSession.isStreaming : textChat.isStreaming;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (mode === "text" && open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [mode, open]);

  // Init on open
  useEffect(() => {
    if (open) {
      if (initialChip) setChipContext(initialChip);
      setMode("text"); // Always start in text mode for the sheet
    }
  }, [open, initialChip]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      setMode("text");
      setShowLogin(false);
      setChipContext(undefined);
      voiceSession.closeSession();
    }
  }, [open]);

  const handleSend = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || isStreaming) return;
    setInput("");
    if (!isAuthenticated) { setShowLogin(true); return; }
    await textChat.sendMessage(t, { currentPage: pathname, voiceMode: false });
  };

  const handleSwitchToVoice = useCallback(() => {
    const greetText = chipGreeting || `${greeting} Quel projet avez-vous en tête ?`;
    setMode("voice");
    voiceSession.openSession(greetText);
  }, [chipGreeting, greeting, voiceSession]);

  const handleSwitchToText = useCallback(() => {
    voiceSession.closeSession();
    setMode("text");
  }, [voiceSession]);

  const handleLogin = () => { onClose(); navigate("/login"); };

  const orbState = voiceSession.state;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(11,21,51,0.18)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col"
            style={{ background: "#F7FBFF", boxShadow: "0 -8px 40px rgba(11,21,51,0.12)" }}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "#DFE9F5" }} />
              <Button variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8 rounded-full" onClick={onClose}>
                <X className="h-4 w-4" style={{ color: "#6C7A92" }} />
              </Button>
            </div>

            {/* Login prompt */}
            {showLogin ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center space-y-5">
                <div className="h-16 w-16 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #3F7BFF, #06B6D4)", boxShadow: "0 8px 24px rgba(63,123,255,0.25)" }}
                >
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="space-y-2 max-w-xs">
                  <p className="text-base font-bold" style={{ color: "#0B1533" }}>{greeting}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#6C7A92" }}>
                    Pour enregistrer votre projet et trouver les meilleurs entrepreneurs, vous devez vous connecter.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button onClick={handleLogin} className="h-12 rounded-2xl font-bold text-sm text-white"
                    style={{ background: "linear-gradient(135deg, #3F7BFF, #06B6D4)", boxShadow: "0 6px 20px rgba(63,123,255,0.3)" }}
                  >
                    Oui, se connecter
                  </button>
                  <button onClick={() => setShowLogin(false)} className="h-12 rounded-2xl font-medium text-sm"
                    style={{ color: "#6C7A92", background: "#EEF3FA" }}
                  >
                    Continuer sans compte
                  </button>
                </div>
              </div>
            ) : mode === "voice" ? (
              /* ─── Voice conversation mode ─── */
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center space-y-5">
                {/* Premium animated orb */}
                <div className="relative flex items-center justify-center">
                  <motion.div className="absolute rounded-full"
                    style={{ width: 180, height: 180, background: "conic-gradient(from 0deg, hsl(222 100% 61% / 0.12), hsl(195 100% 50% / 0.18), hsl(252 100% 65% / 0.12), hsl(222 100% 61% / 0.12))" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: orbState === "thinking" ? 3 : 10, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div className="absolute rounded-full"
                    style={{ width: 160, height: 160, background: "radial-gradient(circle, hsl(222 100% 61% / 0.18) 0%, hsl(252 100% 65% / 0.08) 50%, transparent 70%)" }}
                    animate={{
                      scale: orbState === "speaking" ? [1, 1.3, 1] : orbState === "listening" ? [1, 1.2, 1] : [1, 1.1, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{ duration: orbState === "speaking" ? 0.8 : orbState === "listening" ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {orbState === "listening" && [0, 1, 2].map((i) => (
                    <motion.div key={i} className="absolute rounded-full"
                      style={{ width: 120, height: 120, border: "2px solid hsl(222 100% 61% / 0.15)" }}
                      animate={{ scale: [1, 1.6 + i * 0.25], opacity: [0.6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                    />
                  ))}
                  {orbState === "speaking" && [0, 1, 2].map((i) => (
                    <motion.div key={`s${i}`} className="absolute rounded-full"
                      style={{ width: 120, height: 120, border: "2px solid hsl(195 100% 50% / 0.2)" }}
                      animate={{ scale: [1, 1.5 + i * 0.2], opacity: [0.7, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
                    />
                  ))}
                  {orbState === "thinking" && (
                    <motion.div className="absolute rounded-full"
                      style={{ width: 130, height: 130, border: "2px dashed hsl(252 100% 65% / 0.25)" }}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <motion.div className="relative rounded-full flex items-center justify-center overflow-hidden"
                    style={{ width: 120, height: 120, boxShadow: "0 12px 40px -8px hsl(222 100% 61% / 0.4), 0 0 24px -4px hsl(195 100% 50% / 0.25), inset 0 1px 2px hsl(0 0% 100% / 0.3)" }}
                    animate={
                      orbState === "speaking" ? { scale: [1, 1.08, 1] }
                        : orbState === "listening" ? { scale: [1, 1.06, 1] }
                        : orbState === "thinking" ? { scale: [1, 1.04, 1] }
                        : { scale: [1, 1.03, 1] }
                    }
                    transition={{
                      duration: orbState === "speaking" ? 0.6 : orbState === "listening" ? 1.2 : orbState === "thinking" ? 1.5 : 3.5,
                      repeat: Infinity, ease: "easeInOut",
                    }}
                  >
                    <motion.div className="absolute inset-0"
                      animate={{
                        background: orbState === "speaking"
                          ? ["linear-gradient(135deg, hsl(195 100% 50%), hsl(252 100% 65%), hsl(222 100% 61%))",
                             "linear-gradient(225deg, hsl(222 100% 61%), hsl(195 100% 55%), hsl(252 100% 70%))",
                             "linear-gradient(135deg, hsl(195 100% 50%), hsl(252 100% 65%), hsl(222 100% 61%))"]
                          : ["linear-gradient(135deg, hsl(222 100% 61%), hsl(252 100% 65%), hsl(195 100% 50%))",
                             "linear-gradient(225deg, hsl(252 100% 65%), hsl(195 100% 55%), hsl(222 100% 65%))",
                             "linear-gradient(315deg, hsl(195 100% 50%), hsl(222 100% 61%), hsl(252 100% 70%))",
                             "linear-gradient(135deg, hsl(222 100% 61%), hsl(252 100% 65%), hsl(195 100% 50%))"],
                      }}
                      transition={{ duration: orbState === "speaking" ? 3 : 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="absolute inset-0 rounded-full"
                      style={{ background: "radial-gradient(ellipse 60% 50% at 35% 25%, hsl(0 0% 100% / 0.3), transparent 60%)" }}
                    />
                    <motion.div className="absolute inset-0"
                      style={{ background: "linear-gradient(120deg, transparent 30%, hsl(0 0% 100% / 0.18) 50%, transparent 70%)" }}
                      animate={{ x: ["-120%", "120%"] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
                    />
                    {orbState === "speaking" ? (
                      <Volume2 className="h-11 w-11 text-white relative z-10 drop-shadow-sm" />
                    ) : orbState === "thinking" ? (
                      <Loader2 className="h-11 w-11 text-white relative z-10 drop-shadow-sm animate-spin" />
                    ) : (
                      <Mic className="h-11 w-11 text-white relative z-10 drop-shadow-sm" />
                    )}
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <p className="text-lg font-bold" style={{ color: "#0B1533" }}>
                    {orbState === "speaking" ? "Alex vous parle…"
                      : orbState === "thinking" ? "Alex réfléchit…"
                      : orbState === "listening" ? "Je vous écoute…"
                      : "Décrivez-moi votre projet"}
                  </p>
                </div>

                {/* Voice controls */}
                <div className="flex items-center gap-3">
                  {orbState === "speaking" && (
                    <button onClick={voiceSession.muteSpeech}
                      className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.03]"
                      style={{ color: "#6C7A92", background: "rgba(63,123,255,0.04)", border: "1px solid #E7EEF8" }}
                    >
                      <VolumeX className="h-3.5 w-3.5" /> Couper
                    </button>
                  )}
                  <button onClick={handleSwitchToText}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.03]"
                    style={{ color: "#6C7A92", background: "rgba(63,123,255,0.04)", border: "1px solid #E7EEF8" }}
                  >
                    <Keyboard className="h-3.5 w-3.5" /> Écrire
                  </button>
                  <button onClick={() => { voiceSession.closeSession(); onClose(); }}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.03]"
                    style={{ color: "#EF4444", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}
                  >
                    <Square className="h-3 w-3" /> Arrêter
                  </button>
                </div>
              </div>
            ) : (
              /* ─── Text/chat mode ─── */
              <>
                <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
                  <div className="px-4 py-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg, #3F7BFF, #06B6D4)" }}
                          >
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="rounded-2xl rounded-bl-lg px-4 py-3 text-sm leading-relaxed"
                            style={{ background: "white", border: "1px solid #DFE9F5" }}
                          >
                            {chipGreeting ? (
                              <>
                                <p className="font-bold" style={{ color: "#0B1533" }}>{chipGreeting}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold" style={{ color: "#0B1533" }}>{greeting}</p>
                                <p style={{ color: "#6C7A92" }}>Quel projet avez-vous en tête ?</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-10">
                          {suggestions.map((s) => (
                            <button key={s} onClick={() => handleSend(s)}
                              className="rounded-full px-4 py-2.5 text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97]"
                              style={{ background: "white", color: "#3F7BFF", border: "1px solid #E7EEF8", boxShadow: "0 2px 8px rgba(83,118,180,0.06)" }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 mr-2"
                              style={{ background: "linear-gradient(135deg, #3F7BFF, #06B6D4)" }}
                            >
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "rounded-br-lg" : "rounded-bl-lg"}`}
                            style={msg.role === "user" ? { background: "#3F7BFF", color: "white" } : { background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                          >
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : msg.content}
                            {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                              <span className="inline-flex ml-1">
                                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#3F7BFF" }} />
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]" style={{ borderTop: "1px solid #DFE9F5" }}>
                  <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                    <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                      placeholder="Posez votre question…"
                      className="flex-1 text-sm rounded-2xl h-11"
                      style={{ background: "#EEF3FA", border: "1px solid #DFE9F5", color: "#0B1533" }}
                      disabled={isStreaming}
                    />
                    {voiceSession.sttSupported && (
                      <Button type="button" variant="outline" size="icon"
                        onClick={handleSwitchToVoice}
                        className="shrink-0 rounded-2xl h-11 w-11"
                        style={{ border: "1px solid #DFE9F5" }}
                        disabled={isStreaming}
                      >
                        <Mic className="h-4 w-4" style={{ color: "#6C7A92" }} />
                      </Button>
                    )}
                    <button type="submit" disabled={!input.trim() || isStreaming}
                      className="shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #3F7BFF, #06B6D4)", boxShadow: "0 4px 14px rgba(63,123,255,0.3)" }}
                    >
                      {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
