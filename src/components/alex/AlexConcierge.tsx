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
  MessageCircle,
  X,
  Send,
  Search,
  Upload,
  Calendar,
  Home,
  BarChart3,
  Star,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, typeof Search> = {
  search: Search,
  upload: Upload,
  calendar: Calendar,
  home: Home,
  chart: BarChart3,
  star: Star,
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
    const recs = getRecommendations(intent, {
      hasProperties: (properties ?? []).length > 0,
      hasQuotes: false,
      category,
    });
    setRecommendations(recs);
    await sendMessage(trimmed, { properties, homeScore, currentPage: pathname });
  };

  const handleQuickAction = (message: string) => {
    setInput(message);
    const intent = detectIntent(message);
    const category = detectCategory(message);
    const recs = getRecommendations(intent, {
      hasProperties: (properties ?? []).length > 0,
      category,
    });
    setRecommendations(recs);
    sendMessage(message, { properties, homeScore, currentPage: pathname });
  };

  const handleReset = () => {
    reset();
    setRecommendations([]);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-glow alex-orb flex items-center justify-center"
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
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] max-h-[min(620px,calc(100vh-5rem))] flex flex-col rounded-3xl glass-surface shadow-float overflow-hidden border-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                  <Sparkles className="text-primary-foreground h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">Alex</CardTitle>
                  <p className="text-meta text-muted-foreground">Concierge UNPRO</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Bonjour ! Je suis Alex, votre concierge UNPRO. Comment puis-je vous aider ?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {QUICK_ACTIONS.map((qa) => (
                      <button
                        key={qa.label}
                        onClick={() => handleQuickAction(qa.message)}
                        className="text-left px-4 py-3 rounded-2xl glass-card text-sm hover:bg-primary/5 hover:shadow-soft transition-all duration-200 border-0"
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-lg shadow-soft"
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

                  {/* Recommendations */}
                  {recommendations.length > 0 && !isStreaming && (
                    <div className="space-y-2 pt-2">
                      <p className="text-meta font-medium text-muted-foreground">
                        Actions suggérées :
                      </p>
                      {recommendations.map((rec) => {
                        const Icon = ICON_MAP[rec.icon] ?? Search;
                        return (
                          <Link
                            key={rec.ctaLink}
                            to={rec.ctaLink}
                            className="flex items-start gap-2.5 p-3 rounded-2xl glass-card hover:bg-primary/5 hover:shadow-soft transition-all duration-200"
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{rec.title}</p>
                              <p className="text-meta text-muted-foreground">{rec.description}</p>
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
            <div className="p-4 border-t border-border/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Décrivez votre besoin…"
                  className="flex-1 text-sm rounded-2xl border-0 bg-muted/50 focus-visible:ring-1"
                  disabled={isStreaming}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isStreaming}
                  className="shrink-0 rounded-2xl h-10 w-10 bg-gradient-to-br from-primary to-secondary shadow-soft"
                >
                  <Send className="h-4 w-4" />
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
