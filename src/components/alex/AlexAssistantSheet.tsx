/**
 * AlexAssistantSheet — Premium bottom sheet with voice/text modes,
 * chat interface, chip-triggered conversations, and login prompt.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Mic, Keyboard, Send, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlex } from "@/hooks/useAlex";
import { useAuth } from "@/hooks/useAuth";

type Mode = "choose" | "voice" | "text";

const DEFAULT_SUGGESTIONS = [
  "Rénover ma cuisine",
  "Réparer ma toiture",
  "Obtenir un certificat de localisation",
  "Agrandir ma maison",
];

const CHIP_SUGGESTIONS: Record<string, string[]> = {
  "Rénovation": [
    "Rénover ma cuisine",
    "Rénover ma salle de bain",
    "Rénover mon sous-sol",
    "Trouver un entrepreneur général",
    "Estimer le coût des travaux",
  ],
  "Construction": [
    "Construire un garage",
    "Construire une maison neuve",
    "Trouver un entrepreneur général",
    "Estimer le coût de construction",
  ],
  "Agrandissement": [
    "Agrandir ma maison",
    "Ajouter un étage",
    "Construire une extension",
    "Estimer le coût d'agrandissement",
  ],
  "Toiture": [
    "Réparer ma toiture",
    "Remplacer mon toit",
    "Trouver un couvreur",
    "Estimer le coût de toiture",
  ],
  "Cuisine": [
    "Rénover ma cuisine",
    "Refaire les armoires",
    "Installer un îlot",
    "Estimer le coût de rénovation",
  ],
};

/* ─── Voice hook ─── */
const useVoice = (onResult: (t: string) => void) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
    if (!SR) return;
    const r = new SR();
    r.lang = "fr-CA";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript;
      if (t) onResult(t);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recRef.current = r;
  }, [onResult]);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (listening) recRef.current.stop();
    else { recRef.current.start(); setListening(true); }
  }, [listening]);

  return { listening, supported, toggle };
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
  const { messages, isStreaming, sendMessage, reset } = useAlex();
  const [mode, setMode] = useState<Mode>("choose");
  const [input, setInput] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [chipContext, setChipContext] = useState<string | undefined>();
  const [voiceAutoStarted, setVoiceAutoStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";
  const greeting = firstName ? `Bonjour ${firstName} !` : "Bonjour !";

  // Auto-start voice when sheet opens (voice-first UX)
  useEffect(() => {
    if (open && !voiceAutoStarted) {
      if (initialChip) {
        setChipContext(initialChip);
        setMode("text");
      } else {
        setMode("voice");
        setVoiceAutoStarted(true);
      }
    }
  }, [open, initialChip, voiceAutoStarted]);

  const chipGreeting = chipContext
    ? `${greeting}\n\nComment puis-je vous aider avec vos projets de ${chipContext.toLowerCase()} ?`
    : undefined;

  const suggestions = chipContext
    ? (CHIP_SUGGESTIONS[chipContext] || DEFAULT_SUGGESTIONS)
    : DEFAULT_SUGGESTIONS;

  const handleVoiceResult = useCallback((text: string) => {
    setInput(text);
    setMode("text");
  }, []);

  const { listening, supported, toggle: toggleVoice } = useVoice(handleVoiceResult);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (mode === "text") setTimeout(() => inputRef.current?.focus(), 100);
  }, [mode]);

  useEffect(() => {
    if (!open) {
      setMode("choose");
      setShowLogin(false);
      setChipContext(undefined);
      setVoiceAutoStarted(false);
    }
  }, [open]);

  const handleSend = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || isStreaming) return;
    setInput("");

    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }

    await sendMessage(t, { currentPage: pathname });
  };

  const handleLogin = () => {
    onClose();
    navigate("/login");
  };

  const handleChooseMode = (m: "voice" | "text") => {
    setMode(m);
    if (m === "voice" && supported) {
      toggleVoice();
    }
  };

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
            style={{
              background: "#F7FBFF",
              boxShadow: "0 -8px 40px rgba(11,21,51,0.12)",
            }}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "#DFE9F5" }} />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-8 w-8 rounded-full"
                onClick={onClose}
              >
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
                  <p className="text-sm font-medium" style={{ color: "#0B1533" }}>Je vous montre ?</p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button
                    onClick={handleLogin}
                    className="h-12 rounded-2xl font-bold text-sm text-white"
                    style={{
                      background: "linear-gradient(135deg, #3F7BFF, #06B6D4)",
                      boxShadow: "0 6px 20px rgba(63,123,255,0.3)",
                    }}
                  >
                    Oui, se connecter
                  </button>
                  <button
                    onClick={() => setShowLogin(false)}
                    className="h-12 rounded-2xl font-medium text-sm"
                    style={{ color: "#6C7A92", background: "#EEF3FA" }}
                  >
                    Continuer sans compte
                  </button>
                </div>
              </div>
            ) : mode === "choose" ? (
              /* ─── Choose mode ─── */
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-20 w-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #3F7BFF, #06B6D4)",
                    boxShadow: "0 8px 32px rgba(63,123,255,0.3)",
                  }}
                >
                  <Sparkles className="h-8 w-8 text-white" />
                </motion.div>

                <div className="space-y-1">
                  <p className="text-lg font-bold" style={{ color: "#0B1533" }}>{greeting}</p>
                  <p className="text-sm" style={{ color: "#6C7A92" }}>Quel projet avez-vous en tête ?</p>
                </div>

                <div className="flex gap-4 w-full max-w-xs">
                  {supported && (
                    <button
                      onClick={() => handleChooseMode("voice")}
                      className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white"
                      style={{
                        background: "linear-gradient(135deg, #3F7BFF, #06B6D4)",
                        boxShadow: "0 6px 20px rgba(63,123,255,0.3)",
                      }}
                    >
                      <Mic className="h-4 w-4" /> Parler
                    </button>
                  )}
                  <button
                    onClick={() => handleChooseMode("text")}
                    className={`${supported ? "flex-1" : "w-full"} h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm`}
                    style={{
                      color: "#3F7BFF",
                      background: "rgba(63,123,255,0.06)",
                      border: "1.5px solid rgba(63,123,255,0.18)",
                    }}
                  >
                    <Keyboard className="h-4 w-4" /> Écrire
                  </button>
                </div>
              </div>
            ) : mode === "voice" && listening ? (
              /* ─── Voice mode ─── */
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center space-y-6">
                <motion.div
                  className="h-24 w-24 rounded-full flex items-center justify-center relative"
                  style={{
                    background: "linear-gradient(135deg, #3F7BFF, #06B6D4)",
                    boxShadow: "0 8px 32px rgba(63,123,255,0.3)",
                  }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full"
                      style={{ border: "2px solid rgba(63,123,255,0.2)" }}
                      animate={{ scale: [1, 1.4 + i * 0.2], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
                    />
                  ))}
                  <Mic className="h-10 w-10 text-white relative z-10" />
                </motion.div>

                <p className="text-sm font-medium" style={{ color: "#6C7A92" }}>Je vous écoute…</p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { toggleVoice(); setMode("text"); }}
                  className="rounded-2xl"
                >
                  <Square className="h-3 w-3 mr-1.5" /> Arrêter
                </Button>
              </div>
            ) : (
              /* ─── Text/chat mode ─── */
              <>
                <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
                  <div className="px-4 py-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="space-y-4 pt-2">
                        {/* Greeting */}
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
                              chipGreeting.split("\n").map((line, i) => (
                                <p key={i} className={i === 0 ? "font-bold" : ""} style={{ color: i === 0 ? "#0B1533" : "#6C7A92" }}>
                                  {line || <br />}
                                </p>
                              ))
                            ) : (
                              <>
                                <p className="font-bold" style={{ color: "#0B1533" }}>{greeting}</p>
                                <p style={{ color: "#6C7A92" }}>Quel projet avez-vous en tête ?</p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Suggestion chips */}
                        <div className="flex flex-wrap gap-2 pl-10">
                          {suggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSend(s)}
                              className="rounded-full px-4 py-2.5 text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97]"
                              style={{
                                background: "white",
                                color: "#3F7BFF",
                                border: "1px solid #E7EEF8",
                                boxShadow: "0 2px 8px rgba(83,118,180,0.06)",
                              }}
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
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              msg.role === "user" ? "rounded-br-lg" : "rounded-bl-lg"
                            }`}
                            style={
                              msg.role === "user"
                                ? { background: "#3F7BFF", color: "white" }
                                : { background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }
                            }
                          >
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              msg.content
                            )}
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
                <div className="px-4 py-3" style={{ borderTop: "1px solid #DFE9F5" }}>
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Posez votre question…"
                      className="flex-1 text-sm rounded-2xl h-11"
                      style={{ background: "#EEF3FA", border: "1px solid #DFE9F5", color: "#0B1533" }}
                      disabled={isStreaming}
                    />
                    {supported && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => { setMode("voice"); toggleVoice(); }}
                        className="shrink-0 rounded-2xl h-11 w-11"
                        style={{ border: "1px solid #DFE9F5" }}
                        disabled={isStreaming}
                      >
                        <Mic className="h-4 w-4" style={{ color: "#6C7A92" }} />
                      </Button>
                    )}
                    <button
                      type="submit"
                      disabled={!input.trim() || isStreaming}
                      className="shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center text-white disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, #3F7BFF, #06B6D4)",
                        boxShadow: "0 4px 14px rgba(63,123,255,0.3)",
                      }}
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
