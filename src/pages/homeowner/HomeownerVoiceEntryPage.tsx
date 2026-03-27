/**
 * HomeownerVoiceEntryPage — Full-screen conversational interface for homeowner voice closer.
 * Premium concierge experience: diagnosis → recommendation → booking.
 */
import { useEffect, useRef, useState } from "react";
import { useAlexHomeownerSession } from "@/hooks/useAlexHomeownerSession";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, X, Home, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import AlexOrb from "@/components/alex/AlexOrb";
import { useNavigate } from "react-router-dom";

const QUICK_CHIPS_FR = [
  "Rénovation cuisine",
  "Toiture",
  "Plomberie",
  "Électricité",
  "Déménagement",
  "Notaire",
];

const QUICK_CHIPS_EN = [
  "Kitchen renovation",
  "Roofing",
  "Plumbing",
  "Electrical",
  "Moving",
  "Notary",
];

export default function HomeownerVoiceEntryPage() {
  const navigate = useNavigate();
  const {
    messages, isProcessing, diagnosis, nextAction, language,
    sessionStarted, startSession, sendMessage,
  } = useAlexHomeownerSession();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { startSession(); }, [startSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleChip = (chip: string) => {
    sendMessage(chip);
  };

  const chips = language === "en" ? QUICK_CHIPS_EN : QUICK_CHIPS_FR;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Home className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Alex</h1>
            <p className="text-[10px] text-muted-foreground">
              {language === "fr" ? "Concierge intelligent" : "Smart concierge"}
            </p>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/60 text-foreground rounded-bl-md"
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}

          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Diagnosis Card */}
        {diagnosis && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/60 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {language === "fr" ? "Diagnostic projet" : "Project diagnosis"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {diagnosis.project_type && (
                <div className="flex items-center gap-1.5 text-foreground">
                  <Home className="h-3 w-3 text-muted-foreground" />
                  <span className="capitalize">{diagnosis.project_type}</span>
                </div>
              )}
              {diagnosis.city && (
                <div className="flex items-center gap-1.5 text-foreground">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>{diagnosis.city}</span>
                </div>
              )}
              {diagnosis.urgency && (
                <div className="flex items-center gap-1.5 text-foreground">
                  <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  <span className="capitalize">{diagnosis.urgency}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick chips (show only at start) */}
      {messages.length <= 2 && !isProcessing && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                className="px-3 py-1.5 text-xs rounded-full border border-border/60 bg-card text-foreground hover:bg-muted/60 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <AlexOrb size="sm" />
          </div>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={language === "fr" ? "Décrivez votre projet..." : "Describe your project..."}
              className="w-full rounded-full border border-border/60 bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
              disabled={isProcessing}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
