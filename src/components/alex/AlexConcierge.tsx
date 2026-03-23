/**
 * UNPRO — Alex Unified Concierge
 * Premium floating AI assistant available on all pages.
 * Context-aware suggestions based on current route.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useLocation, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlex } from "@/hooks/useAlex";
import { useAuth } from "@/hooks/useAuth";
import { detectIntent, detectCategory } from "@/services/alexIntentService";
import { getRecommendations, type AlexRecommendation } from "@/services/alexRecommendationService";
import {
  X, Send, Search, Upload, Calendar, Home,
  BarChart3, Star, Loader2, RotateCcw, Sparkles,
  ArrowRight, MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, typeof Search> = {
  search: Search, upload: Upload, calendar: Calendar,
  home: Home, chart: BarChart3, star: Star,
};

interface ContextSuggestion {
  label: string;
  message: string;
}

/** Page-aware quick actions */
const getContextSuggestions = (pathname: string, isAuthenticated: boolean): ContextSuggestion[] => {
  // Public pages — unauthenticated flow
  if (!isAuthenticated) {
    if (pathname === "/" || pathname === "/homeowners") {
      return [
        { label: "Décrire mon projet", message: "J'ai un projet de rénovation et j'aimerais de l'aide pour le décrire." },
        { label: "Comprendre le Score Maison", message: "Comment fonctionne le Score Maison UNPRO?" },
        { label: "Trouver un entrepreneur", message: "Comment trouver un bon entrepreneur sur UNPRO?" },
      ];
    }
    if (pathname === "/professionals" || pathname === "/contractor-onboarding") {
      return [
        { label: "Comprendre le Score AIPP", message: "Comment fonctionne le Score AIPP pour les entrepreneurs?" },
        { label: "Avantages UNPRO", message: "Quels sont les avantages de rejoindre UNPRO comme entrepreneur?" },
        { label: "Processus d'inscription", message: "Comment m'inscrire comme entrepreneur sur UNPRO?" },
      ];
    }
    if (pathname === "/search") {
      return [
        { label: "Aide pour ma recherche", message: "Je ne sais pas quel type d'entrepreneur chercher. Peux-tu m'aider?" },
        { label: "Comprendre les vérifications", message: "Comment UNPRO vérifie les entrepreneurs?" },
      ];
    }
    if (pathname.startsWith("/compare-quotes")) {
      return [
        { label: "Comparer mes soumissions", message: "Comment comparer efficacement mes soumissions?" },
        { label: "Que vérifier dans une soumission", message: "Quels éléments importants vérifier dans une soumission?" },
      ];
    }
    if (pathname === "/aipp-score") {
      return [
        { label: "Améliorer mon Score AIPP", message: "Comment améliorer mon Score AIPP?" },
        { label: "Facteurs du Score", message: "Quels sont les facteurs qui influencent le Score AIPP?" },
      ];
    }
    return [
      { label: "Décrire un projet", message: "J'ai un problème avec ma maison et j'aimerais de l'aide." },
      { label: "Trouver un entrepreneur", message: "Je cherche un entrepreneur pour des travaux." },
      { label: "Comment ça fonctionne", message: "Comment fonctionne UNPRO?" },
    ];
  }

  // Authenticated — dashboard pages
  if (pathname.startsWith("/dashboard/quotes")) {
    return [
      { label: "Analyser une soumission", message: "J'ai reçu une soumission et j'aimerais la faire analyser par l'IA." },
      { label: "Comparer des soumissions", message: "Je veux comparer plusieurs soumissions côte-à-côte." },
      { label: "Éléments à vérifier", message: "Quels éléments importants vérifier dans une soumission?" },
    ];
  }
  if (pathname.startsWith("/dashboard/properties")) {
    return [
      { label: "Améliorer mon Score Maison", message: "Comment améliorer le Score Maison de ma propriété?" },
      { label: "Entretien saisonnier", message: "Quels entretiens faire pour ma maison cette saison?" },
      { label: "Ajouter des documents", message: "Comment ajouter des rapports d'inspection à mon Passeport Maison?" },
    ];
  }
  if (pathname.startsWith("/dashboard/appointments")) {
    return [
      { label: "Préparer un rendez-vous", message: "Comment bien préparer mon rendez-vous avec un entrepreneur?" },
      { label: "Nouveau rendez-vous", message: "Je veux prendre rendez-vous avec un entrepreneur." },
    ];
  }
  if (pathname.startsWith("/dashboard/home-score")) {
    return [
      { label: "Comprendre mon score", message: "Explique-moi les composantes de mon Score Maison." },
      { label: "Améliorer mon score", message: "Quels travaux auraient le plus d'impact sur mon Score Maison?" },
    ];
  }

  // Pro dashboard
  if (pathname.startsWith("/pro")) {
    return [
      { label: "Améliorer mon Score AIPP", message: "Comment améliorer mon Score AIPP pour être mieux recommandé?" },
      { label: "Optimiser mon profil", message: "Quels éléments ajouter à mon profil pour augmenter ma crédibilité?" },
      { label: "Comprendre mes leads", message: "Comment fonctionne la qualification des leads sur UNPRO?" },
    ];
  }

  // Default authenticated
  return [
    { label: "Décrire un projet", message: "J'ai un projet de rénovation et j'aimerais de l'aide." },
    { label: "Analyser une soumission", message: "J'ai reçu une soumission et j'aimerais la faire analyser." },
    { label: "Trouver un entrepreneur", message: "Je cherche un entrepreneur pour des travaux." },
    { label: "Entretien maison", message: "Quels entretiens devrais-je faire pour ma maison?" },
  ];
};

interface AlexConciergeProps {
  properties?: Array<{ address: string; city?: string | null; property_type?: string | null; property_family?: string | null; year_built?: number | null }>;
  homeScore?: number | null;
  propertyFamily?: string | null;
  propertyType?: string | null;
  occupancyStatus?: string | null;
}

const AlexConcierge = ({ properties, homeScore, propertyFamily, propertyType, occupancyStatus }: AlexConciergeProps) => {
  const isHomePage = useLocation().pathname === "/";
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { openAlex: openAlexVoice } = useAlexVoice();
  const { pathname } = useLocation();
  const { messages, isStreaming, sendMessage, reset } = useAlex();
  const [input, setInput] = useState("");
  const [recommendations, setRecommendations] = useState<AlexRecommendation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const contextSuggestions = useMemo(
    () => getContextSuggestions(pathname, isAuthenticated),
    [pathname, isAuthenticated]
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    const intent = detectIntent(trimmed);
    const category = detectCategory(trimmed);
    const recs = getRecommendations(intent, { hasProperties: (properties ?? []).length > 0, hasQuotes: false, category });
    setRecommendations(recs);
    await sendMessage(trimmed, { properties, homeScore, currentPage: pathname, propertyFamily, propertyType, occupancyStatus });
  };

  const handleQuickAction = (message: string) => {
    setInput("");
    const intent = detectIntent(message);
    const category = detectCategory(message);
    const recs = getRecommendations(intent, { hasProperties: (properties ?? []).length > 0, category });
    setRecommendations(recs);
    sendMessage(message, { properties, homeScore, currentPage: pathname, propertyFamily, propertyType, occupancyStatus });
  };

  const handleReset = () => {
    reset();
    setRecommendations([]);
  };

  return (
    <>
      {/* ── Floating Orb ── */}
      <AnimatePresence>
        {!isOpen && !isHomePage && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 1.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => { const { openAlex } = useAlexVoice(); openAlex("general"); }}
            className="fixed bottom-36 right-5 z-50 group"
            aria-label="Ouvrir Alex"
          >
            {/* Ambient glow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(222 100% 65% / 0.25) 0%, transparent 70%)",
              }}
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Orb body */}
            <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow-lg transition-shadow group-hover:shadow-[0_0_40px_-4px_hsl(222_100%_65%_/_0.4)]">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>

            {/* Tooltip hint */}
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 3, duration: 0.4 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-card/90 backdrop-blur-xl border border-border/40 rounded-2xl px-3.5 py-2 shadow-elevated pointer-events-none"
            >
              <p className="text-[0.65rem] font-medium text-foreground">
                Besoin d'aide ? Demandez à Alex 💡
              </p>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 rotate-45 bg-card/90 border-r border-t border-border/40" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] max-h-[min(600px,calc(100vh-5rem))] flex flex-col rounded-3xl bg-card/95 backdrop-blur-2xl shadow-dramatic overflow-hidden border border-border/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30 bg-card/50">
              <div className="flex items-center gap-3">
                <motion.div
                  className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow"
                  animate={{
                    boxShadow: [
                      "0 0 16px -4px hsl(222 100% 65% / 0.2)",
                      "0 0 24px -4px hsl(222 100% 65% / 0.35)",
                      "0 0 16px -4px hsl(222 100% 65% / 0.2)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="text-primary-foreground h-3.5 w-3.5" />
                </motion.div>
                <div>
                  <p className="text-meta font-bold text-foreground leading-none">Alex</p>
                  <p className="text-caption text-muted-foreground mt-0.5">Concierge IA UNPRO</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-xl text-muted-foreground" onClick={handleReset} title="Nouvelle conversation">
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Link
                  to="/alex"
                  className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Plein écran"
                  onClick={() => setIsOpen(false)}
                >
                  <MessageCircle className="h-3 w-3" />
                </Link>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-xl text-muted-foreground" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center pt-2">
                    <p className="text-body font-semibold text-foreground mb-1">
                      Bonjour, je suis Alex 👋
                    </p>
                    <p className="text-meta text-muted-foreground leading-relaxed">
                      Votre concierge IA. Je peux vous aider à décrire un projet, analyser des soumissions, trouver un entrepreneur ou planifier un rendez-vous.
                    </p>
                  </div>

                  {/* Context-aware suggestions */}
                  <div className="space-y-1.5">
                    <p className="text-caption uppercase tracking-wider text-muted-foreground/70 font-semibold px-1">
                      Suggestions
                    </p>
                    {contextSuggestions.map((qa) => (
                      <button
                        key={qa.label}
                        onClick={() => handleQuickAction(qa.message)}
                        className="w-full text-left px-3.5 py-2.5 rounded-2xl border border-border/20 bg-muted/20 hover:bg-muted/40 hover:border-border/40 transition-all duration-200 group"
                      >
                        <span className="text-meta font-medium text-foreground/90 group-hover:text-foreground transition-colors">
                          {qa.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shrink-0 mt-1 mr-2">
                          <Sparkles className="text-primary-foreground h-2.5 w-2.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-meta leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-lg"
                            : "bg-muted/30 text-foreground rounded-bl-lg border border-border/20"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:my-2 text-meta">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                        {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                          <span className="inline-flex ml-1.5 gap-0.5 items-center">
                            <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                            <span className="h-1 w-1 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                            <span className="h-1 w-1 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Action recommendations */}
                  {recommendations.length > 0 && !isStreaming && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1.5 pl-8"
                    >
                      <p className="text-caption uppercase tracking-wider text-muted-foreground/70 font-semibold">
                        Actions suggérées
                      </p>
                      {recommendations.map((rec) => {
                        const Icon = ICON_MAP[rec.icon] ?? Search;
                        return (
                          <Link
                            key={rec.ctaLink}
                            to={rec.ctaLink}
                            className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/20 bg-muted/10 hover:bg-muted/30 hover:border-primary/20 transition-all group"
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="h-7 w-7 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/14 transition-colors">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-meta font-medium text-foreground">{rec.title}</p>
                              <p className="text-caption text-muted-foreground truncate">{rec.description}</p>
                            </div>
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border/30 bg-card/30">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question à Alex…"
                  className="flex-1 text-meta rounded-2xl border-border/30 bg-muted/20 focus-visible:ring-1 h-9"
                  disabled={isStreaming}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isStreaming}
                  className="shrink-0 rounded-2xl h-9 w-9 bg-gradient-to-br from-primary to-secondary shadow-glow"
                >
                  {isStreaming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
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
