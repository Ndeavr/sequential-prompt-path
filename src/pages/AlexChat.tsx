import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlex } from "@/hooks/useAlex";
import { useAuth } from "@/hooks/useAuth";
import { detectIntent, detectCategory } from "@/services/alexIntentService";
import { getRecommendations, type AlexRecommendation } from "@/services/alexRecommendationService";
import {
  createIntentSession, getIntentSession, resetIntentSession,
  incrementMessageCount, shouldAutoAdvance, advancePhase,
  getPhaseGatedActions, getPhaseLabel, phaseActionsToRecommendations,
  type IntentSession,
} from "@/services/alexIntentPhaseEngine";
import {
  Send, Search, Upload, Calendar, Home, BarChart3, Star,
  Loader2, RotateCcw, Sparkles, ArrowLeft, Mic, MicOff, Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, typeof Search> = {
  search: Search, upload: Upload, calendar: Calendar,
  home: Home, chart: BarChart3, star: Star,
};

const GUEST_ACTIONS = [
  { emoji: "🏠", label: "Décrire un projet", message: "J'ai un problème avec ma maison et j'aimerais de l'aide." },
  { emoji: "🔍", label: "Trouver un entrepreneur", message: "Je cherche un entrepreneur pour des travaux." },
  { emoji: "📄", label: "Analyser une soumission", message: "J'ai reçu une soumission et j'aimerais la faire analyser." },
  { emoji: "🔧", label: "Entretien maison", message: "Quels entretiens devrais-je faire pour ma maison?" },
];

const AUTH_ACTIONS = [
  { emoji: "🏠", label: "Mon Home Score", message: "Quel est le score de ma maison et comment l'améliorer?" },
  { emoji: "📋", label: "Mon passeport maison", message: "Aide-moi à compléter mon passeport maison." },
  { emoji: "🔍", label: "Trouver un pro", message: "Je cherche un entrepreneur de confiance pour mes travaux." },
  { emoji: "📄", label: "Analyser une soumission", message: "J'ai reçu une soumission, peux-tu l'analyser?" },
  { emoji: "🔧", label: "Entretien préventif", message: "Quels entretiens devrais-je planifier pour ma maison?" },
  { emoji: "🚨", label: "Urgence maison", message: "J'ai une urgence à la maison, aide-moi!" },
];

/* ─── Voice hook using Web Speech API ─── */
const useVoiceInput = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "fr-CA";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript;
      if (text) onResult(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, [onResult]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  return { isListening, isSupported, toggle };
};

const AlexChat = () => {
  const { isAuthenticated, session } = useAuth();
  const { pathname } = useLocation();
  const { messages, isStreaming, sendMessage, reset } = useAlex();
  const [input, setInput] = useState("");
  const [recommendations, setRecommendations] = useState<AlexRecommendation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userName = session?.user?.user_metadata?.full_name?.split(" ")[0]
    || session?.user?.user_metadata?.first_name
    || null;

  const handleVoiceResult = useCallback((text: string) => {
    setInput(text);
  }, []);

  const { isListening, isSupported, toggle: toggleVoice } = useVoiceInput(handleVoiceResult);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    const intent = detectIntent(trimmed);
    const category = detectCategory(trimmed);

    // Phase-gated recommendations
    let session = getIntentSession();
    if (!session) {
      session = createIntentSession(intent, trimmed);
    } else {
      incrementMessageCount(session);
      if (shouldAutoAdvance(session)) {
        advancePhase(session);
      }
    }

    const phaseActions = getPhaseGatedActions(session, { category, hasProperties: false });
    const recs = phaseActionsToRecommendations(phaseActions);
    setRecommendations(recs);
    await sendMessage(trimmed, { currentPage: pathname });
  };

  const handleReset = () => {
    reset();
    setRecommendations([]);
    resetIntentSession();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="shrink-0 glass-surface border-b border-border/40 px-4 py-3 flex items-center gap-3 z-10">
        <Link to="/" className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow shrink-0">
          <Sparkles className="text-primary-foreground h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground">Alex</h1>
          <p className="text-[10px] text-muted-foreground">Concierge IA UNPRO</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handleReset} title="Nouvelle conversation">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </header>

      {/* ─── Messages ─── */}
      <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center pt-8 space-y-6"
            >
              {/* Orb */}
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow alex-orb">
                <Sparkles className="text-primary-foreground h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  {userName ? `Bonjour ${userName} 👋` : "Bonjour, je suis Alex"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  {userName
                    ? "Comment puis-je vous aider aujourd'hui?"
                    : "Votre concierge IA UNPRO. Posez vos questions sur vos travaux, votre maison ou trouvez un entrepreneur."}
                </p>
              </div>

              {/* Quick action pills */}
              <div className={`grid gap-2 w-full max-w-sm ${isAuthenticated ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
                {(isAuthenticated ? AUTH_ACTIONS : GUEST_ACTIONS).map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => handleSend(qa.message)}
                    className="glass-card rounded-2xl p-4 text-left hover:shadow-elevation transition-all group"
                  >
                    <span className="text-lg">{qa.emoji}</span>
                    <p className="text-xs font-medium text-foreground mt-2 leading-tight group-hover:text-primary transition-colors">{qa.label}</p>
                  </button>
                ))}
              </div>

              {isSupported && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Mic className="h-3 w-3" /> Vous pouvez aussi utiliser le micro pour parler à Alex
                </p>
              )}
            </motion.div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shrink-0 mt-1 mr-2">
                      <Sparkles className="text-primary-foreground h-3 w-3" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-lg"
                        : "glass-card text-foreground rounded-bl-lg"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:my-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                    {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                      <span className="inline-flex ml-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Recommendations */}
              <AnimatePresence>
                {recommendations.length > 0 && !isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2 pl-9"
                  >
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions suggérées</p>
                    {recommendations.map((rec) => {
                      const Icon = ICON_MAP[rec.icon] ?? Search;
                      return (
                        <Link
                          key={rec.ctaLink}
                          to={rec.ctaLink}
                          className="flex items-center gap-3 p-3 rounded-2xl glass-card hover:shadow-elevation transition-all"
                        >
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{rec.title}</p>
                            <p className="text-[11px] text-muted-foreground">{rec.description}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </ScrollArea>

      {/* ─── Input bar ─── */}
      <div className="shrink-0 glass-surface border-t border-border/40 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Voice recording indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-destructive/10"
              >
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs text-destructive font-medium">Écoute en cours...</span>
                <Button variant="ghost" size="sm" onClick={toggleVoice} className="ml-auto h-6 px-2 text-xs">
                  <Square className="h-3 w-3 mr-1" /> Arrêter
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Parlez maintenant…" : "Posez votre question à Alex…"}
                className="pr-4 text-sm rounded-2xl border-border/60 bg-muted/30 focus-visible:ring-1 h-11"
                disabled={isStreaming}
              />
            </div>

            {/* Voice button */}
            {isSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleVoice}
                className="shrink-0 rounded-2xl h-11 w-11"
                disabled={isStreaming}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}

            {/* Send button */}
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="shrink-0 rounded-2xl h-11 w-11 bg-gradient-to-br from-primary to-secondary shadow-glow"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Alex peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlexChat;
