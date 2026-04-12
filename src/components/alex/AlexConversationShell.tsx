/**
 * AlexConversationShell — Full-screen immersive conversation with Alex.
 * Dual mode: voice + text. Premium mobile-first experience.
 * Wired end-to-end: session → conversation → matching → booking → contact capture.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AlexOrbState from "./AlexOrbState";
import AlexQuickReplyChips from "./AlexQuickReplyChips";
import AlexLiveTranscript from "./AlexLiveTranscript";
import AlexMatchCard from "./AlexMatchCard";
import AlexContactCapture from "./AlexContactCapture";
import AlexBookingCTA from "./AlexBookingCTA";
import { useAlexSession, type AlexStep } from "@/hooks/useAlexSession";
import { useAlexConversation, type AlexMessage, type AlexNextAction } from "@/hooks/useAlexConversation";
import { useAlexVoiceInput } from "@/hooks/useAlexVoiceInput";
import ReactMarkdown from "react-markdown";
import UnproIcon from "@/components/brand/UnproIcon";

interface AlexConversationShellProps {
  onClose: () => void;
  entrypoint?: string;
}

export default function AlexConversationShell({ onClose, entrypoint = "voice" }: AlexConversationShellProps) {
  const alexSession = useAlexSession();
  const [textInput, setTextInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didStartRef = useRef(false);

  const conversation = useAlexConversation({
    sessionToken: alexSession.sessionToken,
    onStepChange: alexSession.setStep,
  });

  // Voice input
  const voice = useAlexVoiceInput({
    language: "fr-CA",
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        conversation.sendMessage(text, "voice");
      }
    },
  });

  // Auto-start session
  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;

    alexSession.startSession(entrypoint).then((state) => {
      if (state?.greeting) {
        conversation.addGreeting(state.greeting);
      }
    });
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.messages, conversation.primaryMatch, conversation.nextAction]);

  const handleSendText = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    conversation.sendMessage(text, "text");
  }, [textInput, conversation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  const handleChipSelect = useCallback((value: string) => {
    conversation.sendMessage(value, "text");
  }, [conversation]);

  const handleMatchCalendar = useCallback(() => {
    alexSession.setStep("opening_calendar");
    conversation.sendMessage("Je veux voir les disponibilités.", "text");
  }, [alexSession, conversation]);

  const handleMatchLearnMore = useCallback(() => {
    conversation.sendMessage("Dis-moi en plus sur cet entrepreneur.", "text");
  }, [conversation]);

  const handleContactCaptured = useCallback((data: { firstName: string; phone: string }) => {
    conversation.sendMessage(`Mon prénom est ${data.firstName} et mon numéro est ${data.phone}.`, "text");
  }, [conversation]);

  // Determine which inline action to show
  const showMatchCard = conversation.primaryMatch && !conversation.nextAction?.type?.includes("calendar");
  const showContactCapture = conversation.nextAction?.type === "capture_contact";
  const showBookingCTA = conversation.nextAction?.type === "open_calendar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 bg-card/60">
              <img src={logo} alt="Alex" className="w-full h-full object-contain" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground font-display">Alex</h2>
            <p className="text-[10px] text-muted-foreground">
              {alexSession.currentStep === "listening"
                ? "Je vous écoute…"
                : alexSession.currentStep === "thinking"
                ? "Je regarde…"
                : alexSession.currentStep === "matching"
                ? "Je cherche le meilleur pro…"
                : alexSession.currentStep === "preparing_booking"
                ? "Je prépare le rendez-vous…"
                : alexSession.currentStep === "opening_calendar"
                ? "Ouverture du calendrier…"
                : alexSession.currentStep === "speaking"
                ? "Alex parle…"
                : "En ligne"}
            </p>
          </div>
        </div>

        {/* Booking readiness indicator */}
        {conversation.bookingReadiness > 0 && (
          <div className="flex items-center gap-1.5 mr-2">
            <div className="h-1 w-12 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                animate={{ width: `${conversation.bookingReadiness}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {conversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Inline action cards based on backend response */}
        {showMatchCard && conversation.primaryMatch && (
          <AlexMatchCard
            match={conversation.primaryMatch}
            onViewCalendar={handleMatchCalendar}
            onLearnMore={handleMatchLearnMore}
          />
        )}

        {showContactCapture && (
          <AlexContactCapture
            sessionToken={alexSession.sessionToken}
            onCaptured={handleContactCaptured}
          />
        )}

        {showBookingCTA && (
          <AlexBookingCTA
            contractorId={conversation.primaryMatch?.contractor_id}
            label={conversation.nextAction?.label || "Je vous montre les disponibilités."}
          />
        )}

        {/* Live voice transcript */}
        {voice.isListening && voice.liveTranscript && (
          <AlexLiveTranscript text={voice.liveTranscript} />
        )}

        {/* Processing indicator */}
        {conversation.isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2"
          >
            <AlexOrbState step={alexSession.currentStep} size={28} />
          </motion.div>
        )}
      </div>

      {/* Quick reply chips */}
      <div className="px-4 pb-2">
        <AlexQuickReplyChips
          step={alexSession.currentStep}
          onSelect={handleChipSelect}
        />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-safe pt-2 border-t border-border/30 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          {/* Mic button */}
          {voice.isSupported && (
            <Button
              variant={voice.isListening ? "default" : "outline"}
              size="icon"
              onClick={voice.toggleListening}
              className={`rounded-full shrink-0 ${
                voice.isListening
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : ""
              }`}
            >
              {voice.isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          )}

          {/* Text input */}
          <Input
            ref={inputRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message…"
            className="rounded-full bg-muted/50 border-border/50 text-sm"
            disabled={conversation.isProcessing}
          />

          {/* Send button */}
          <Button
            variant="default"
            size="icon"
            onClick={handleSendText}
            disabled={!textInput.trim() || conversation.isProcessing}
            className="rounded-full shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Permission denied banner */}
        {voice.permissionDenied && (
          <p className="text-[10px] text-destructive text-center mt-1.5">
            Micro refusé — utilisez le clavier pour écrire.
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Message Bubble ── */
function MessageBubble({ message }: { message: AlexMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border/60 text-foreground rounded-bl-md"
        }`}
      >
        {!isUser && (
          <span className="text-[10px] font-bold text-primary mb-1 block tracking-wide uppercase">
            Alex
          </span>
        )}
        <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert [&>p]:mb-1 [&>p:last-child]:mb-0">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}