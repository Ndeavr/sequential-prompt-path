/**
 * Alex Renovation Visualizer — Guided renovation transformation experience.
 */
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Camera, Send, Loader2, RotateCcw, Sparkles, Upload,
  Image as ImageIcon, Wand2, Users, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlexRenovation } from "@/hooks/useAlexRenovation";
import { useAuth } from "@/hooks/useAuth";

const QUICK_GOALS = [
  { label: "Style", emoji: "🎨" },
  { label: "Valeur", emoji: "📈" },
  { label: "Fonction", emoji: "⚙️" },
  { label: "Luminosité", emoji: "☀️" },
  { label: "Efficacité", emoji: "🌿" },
  { label: "Attrait", emoji: "✨" },
];

const RenovationVisualizerPage = () => {
  const { isAuthenticated } = useAuth();
  const {
    messages, isStreaming, step, photoBase64, transformations,
    isGenerating, uploadPhoto, sendMessage, reset,
  } = useAlexRenovation();

  const [input, setInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, transformations]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return; // 10MB limit
    uploadPhoto(file);
  };

  const handleSend = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || isStreaming || isGenerating) return;
    setInput("");
    await sendMessage(t);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border/40 px-4 py-3 flex items-center gap-3 z-10 bg-background/80 backdrop-blur-md">
        <Link to="/" className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
        >
          <Wand2 className="text-primary-foreground h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground">Alex — Visualiseur</h1>
          <p className="text-[10px] text-muted-foreground">Transformez vos espaces</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </header>

      {/* Main content */}
      <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Upload state */}
          {step === "upload" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center pt-6 space-y-6"
            >
              <div className="h-20 w-20 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
                  boxShadow: "0 8px 32px hsl(var(--primary) / 0.25)",
                }}
              >
                <Wand2 className="text-primary-foreground h-8 w-8" />
              </div>

              <div className="space-y-2 max-w-xs">
                <h2 className="text-xl font-bold text-foreground">Visualisez votre rénovation</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Prenez une photo de votre espace et Alex vous guidera vers des concepts de transformation personnalisés.
                </p>
              </div>

              {/* Upload zone */}
              <div
                className={`w-full max-w-sm border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Téléversez une photo</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG — max 10 Mo</p>
                  </div>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* Example projects */}
              <div className="w-full max-w-sm space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projets populaires</p>
                <div className="grid grid-cols-3 gap-2">
                  {["🍳 Cuisine", "🛁 Salle de bain", "🏠 Façade", "🌿 Cour", "🏗️ Sous-sol", "🎨 Peinture"].map((item) => (
                    <button key={item}
                      className="rounded-xl p-3 text-xs font-medium bg-muted/30 hover:bg-muted/60 transition-colors text-foreground"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Identifying room */}
          {step === "identify" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center pt-8 space-y-4"
            >
              {photoBase64 && (
                <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-lg">
                  <img src={photoBase64} alt="Uploaded" className="w-full h-48 object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Alex analyse votre photo…</p>
              </div>
            </motion.div>
          )}

          {/* Chat messages */}
          {(step === "questions" || step === "generating" || step === "results") && (
            <>
              {/* Original photo thumbnail */}
              {photoBase64 && (
                <div className="flex justify-end">
                  <div className="max-w-[60%] rounded-2xl overflow-hidden shadow-md">
                    <img src={photoBase64} alt="Original" className="w-full h-32 object-cover" />
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.filter(m => !m.images || m.role !== "user" || messages.indexOf(m) > 0).map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 mr-2"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                    >
                      <Sparkles className="text-primary-foreground h-3 w-3" />
                    </div>
                  )}
                  <div className={`max-w-[80%] space-y-3`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-lg"
                        : "bg-card border border-border/40 text-foreground rounded-bl-lg"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                      {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                        <span className="inline-flex ml-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </span>
                      )}
                    </div>

                    {/* Transformation images */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="grid gap-2">
                        {msg.images.map((img, j) => (
                          <div key={j} className="rounded-2xl overflow-hidden shadow-lg border border-border/40">
                            <img src={img} alt={`Concept ${j + 1}`} className="w-full" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Generating indicator */}
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                  >
                    <Wand2 className="text-primary-foreground h-3 w-3 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Création de votre concept…</p>
                  </div>
                </motion.div>
              )}

              {/* Contractor CTA after results */}
              {step === "results" && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3 pl-9"
                >
                  <Link to="/recherche"
                    className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/40 hover:shadow-md transition-all group"
                  >
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "hsl(var(--primary) / 0.1)" }}
                    >
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        Trouver des entrepreneurs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Professionnels vérifiés pour ce type de projet
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  {!isAuthenticated && (
                    <Link to="/inscription"
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 border-primary/20 hover:border-primary/40 transition-all group"
                      style={{ background: "hsl(var(--primary) / 0.03)" }}
                    >
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                      >
                        <Sparkles className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Sauvegarder mon projet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Créez un compte pour garder vos concepts
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input bar — visible during questions step */}
      {(step === "questions" || step === "results") && (
        <div className="shrink-0 border-t border-border/40 px-4 py-3 bg-background/80 backdrop-blur-md">
          <div className="max-w-2xl mx-auto">
            {/* Quick chips for first question */}
            {messages.length <= 2 && step === "questions" && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {QUICK_GOALS.map(g => (
                  <button key={g.label}
                    onClick={() => handleSend(g.label)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium bg-muted/40 hover:bg-muted/70 transition-colors text-foreground border border-border/40"
                  >
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Répondez à Alex…"
                className="flex-1 text-sm rounded-2xl border-border/60 bg-muted/30 h-11"
                disabled={isStreaming || isGenerating}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming || isGenerating}
                className="shrink-0 rounded-2xl h-11 w-11"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenovationVisualizerPage;
