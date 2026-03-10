import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlex } from "@/hooks/useAlex";
import { useAuth } from "@/hooks/useAuth";
import { detectIntent, detectCategory } from "@/services/alexIntentService";
import { getRecommendations, type AlexRecommendation } from "@/services/alexRecommendationService";
import {
  MessageCircle, X, Send, Search, Upload, Calendar, Home,
  BarChart3, Star, Loader2, RotateCcw, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, typeof Search> = {
  search: Search, upload: Upload, calendar: Calendar,
  home: Home, chart: BarChart3, star: Star,
};

const QUICK_ACTIONS = [
  { label: "Décrire un projet", message: "J'ai un problème avec ma maison et j'aimerais de l'aide." },
  { label: "Trouver un entrepreneur", message: "Je cherche un entrepreneur pour des travaux." },
  { label: "Analyser une soumission", message: "J'ai reçu une soumission et j'aimerais la faire analyser." },
  { label: "Entretien maison", message: "Quels entretiens devrais-je faire pour ma maison?" },
];

interface AlexConciergeProps {
  properties?: Array<{ address: string; city?: string | null }>;
  homeScore?: number | null;
}

const AlexConcierge = ({ properties, homeScore }: AlexConciergeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const { messages, isStreaming, sendMessage, reset } = useAlex();
  const [input, setInput] = useState("");
  const [recommendations, setRecommendations] = useState<AlexRecommendation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isAuthenticated) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    const intent = detectIntent(trimmed);
    const category = detectCategory(trimmed);
    const recs = getRecommendations(intent, { hasProperties: (properties ?? []).length > 0, hasQuotes: false, category });
    setRecommendations(recs);
    await sendMessage(trimmed, { properties, homeScore, currentPage: pathname });
  };

  const handleQuickAction = (message: string) => {
    setInput(message);
    const intent = detectIntent(message);
    const category = detectCategory(message);
    const recs = getRecommendations(intent, { hasProperties: (properties ?? []).length > 0, category });
    setRecommendations(recs);
    sendMessage(message, { properties, homeScore, currentPage: pathname });
  };

  const handleReset = () => {
    reset();
    setRecommendations([]);
  };

  return (
    <>
      {/* Floating orb */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground shadow-glow-lg alex-orb flex items-center justify-center"
            aria-label="Ouvrir Alex"
          >
            <Sparkles className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] max-h-[min(580px,calc(100vh-5rem))] flex flex-col rounded-3xl glass-surface shadow-xl overflow-hidden border border-border/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow">
                  <Sparkles className="text-primary-foreground h-3.5 w-3.5" />
                </div>
                <div>
                  <CardTitle className="text-xs">Alex</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Concierge IA UNPRO</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-xl" onClick={handleReset}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-xl" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Bonjour ! Je suis Alex, votre concierge UNPRO. Comment puis-je vous aider ?
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {QUICK_ACTIONS.map((qa) => (
                      <button
                        key={qa.label}
                        onClick={() => handleQuickAction(qa.message)}
                        className="text-left px-4 py-2.5 rounded-2xl glass-card text-xs hover:bg-primary/5 transition-colors border-0"
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-lg shadow-sm"
                            : "glass-card text-foreground rounded-bl-lg"
                        }`}
                      >
                        {msg.content}
                        {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                          <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {recommendations.length > 0 && !isStreaming && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] font-medium text-muted-foreground">Actions suggérées :</p>
                      {recommendations.map((rec) => {
                        const Icon = ICON_MAP[rec.icon] ?? Search;
                        return (
                          <Link
                            key={rec.ctaLink}
                            to={rec.ctaLink}
                            className="flex items-start gap-2.5 p-2.5 rounded-2xl glass-card hover:bg-primary/5 transition-colors"
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium">{rec.title}</p>
                              <p className="text-[10px] text-muted-foreground">{rec.description}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border/40">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Décrivez votre besoin…"
                  className="flex-1 text-xs rounded-2xl border-0 bg-muted/40 focus-visible:ring-1 h-9"
                  disabled={isStreaming}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isStreaming}
                  className="shrink-0 rounded-2xl h-9 w-9 bg-gradient-to-br from-primary to-secondary shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AlexConcierge;
