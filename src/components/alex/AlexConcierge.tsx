import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

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
  /** Platform context for smarter recommendations */
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

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isAuthenticated) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput("");

    // Detect intent and generate recommendations
    const intent = detectIntent(trimmed);
    const category = detectCategory(trimmed);
    const recs = getRecommendations(intent, {
      hasProperties: (properties ?? []).length > 0,
      hasQuotes: false,
      category,
    });
    setRecommendations(recs);

    await sendMessage(trimmed, {
      properties,
      homeScore,
      currentPage: pathname,
    });
  };

  const handleQuickAction = (message: string) => {
    setInput(message);
    // Trigger send
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
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          aria-label="Ouvrir Alex"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] max-h-[min(600px,calc(100vh-5rem))] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">A</span>
              </div>
              <div>
                <CardTitle className="text-sm">Alex</CardTitle>
                <p className="text-xs text-muted-foreground">Concierge UNPRO</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Bonjour ! Je suis Alex, votre concierge UNPRO. Comment puis-je vous aider ?
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => handleQuickAction(qa.message)}
                      className="text-left px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                      {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                        <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Recommendations */}
                {recommendations.length > 0 && !isStreaming && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Actions suggérées :
                    </p>
                    {recommendations.map((rec) => {
                      const Icon = ICON_MAP[rec.icon] ?? Search;
                      return (
                        <Link
                          key={rec.ctaLink}
                          to={rec.ctaLink}
                          className="flex items-start gap-2 p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{rec.title}</p>
                            <p className="text-xs text-muted-foreground">{rec.description}</p>
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
          <div className="p-3 border-t border-border">
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
                className="flex-1 text-sm"
                disabled={isStreaming}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AlexConcierge;
