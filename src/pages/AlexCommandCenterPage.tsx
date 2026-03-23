/**
 * AlexCommandCenterPage — Premium unified Alex experience.
 * Voice-first, text-fallback, quick actions, transcript, next action.
 * Mobile-first immersive full-screen.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Square, X, Send, MessageCircle, VolumeX,
  Camera, BarChart3, CalendarCheck, ShieldCheck,
  ChevronRight, Sparkles, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAlexVoiceFull, type VoiceState, type UIAction } from "@/hooks/useAlexVoice";
import { useAuth } from "@/hooks/useAuth";
import { dispatchAlexActions, cleanupAlexOverlays, type AlexUIAction, type DispatcherDeps } from "@/lib/alexUiActionDispatcher";

// ─── Quick actions ───
const OWNER_ACTIONS = [
  { label: "Envoyer une photo", icon: Camera, action: "open_upload" },
  { label: "Voir mon score", icon: BarChart3, action: "show_score" },
  { label: "Prendre rendez-vous", icon: CalendarCheck, action: "open_booking" },
  { label: "Vérifier un entrepreneur", icon: ShieldCheck, action: "navigate", target: "/verifier-entrepreneur" },
];

// ─── Voice Orb ───
function CommandOrb({ state, holding }: { state: VoiceState; holding: boolean }) {
  const visualState = holding ? "listening" : state;
  const size = visualState === "listening" ? 160 : visualState === "speaking" ? 140 : visualState === "thinking" ? 130 : 120;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* Outer pulse */}
      <motion.div
        animate={{
          scale: visualState === "listening" ? [1, 1.2, 1] : visualState === "speaking" ? [1, 1.1, 1] : 1,
          opacity: visualState === "idle" ? 0.15 : 0.4,
        }}
        transition={{ duration: visualState === "listening" ? 1 : 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full"
        style={{ width: size + 50, height: size + 50, background: `radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)` }}
      />

      {/* Core */}
      <motion.div
        animate={{ width: size, height: size, scale: visualState === "thinking" ? [1, 0.94, 1] : 1 }}
        transition={{
          width: { type: "spring", stiffness: 200, damping: 20 },
          height: { type: "spring", stiffness: 200, damping: 20 },
          scale: { duration: 0.8, repeat: visualState === "thinking" ? Infinity : 0, ease: "easeInOut" },
        }}
        className="rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: `radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.55))`,
          boxShadow: `0 0 ${visualState === "idle" ? 15 : 35}px hsl(var(--primary) / ${visualState === "idle" ? 0.12 : 0.25})`,
        }}
      >
        <AnimatePresence mode="wait">
          {visualState === "listening" && (
            <motion.div key="l" initial={{ scale: 0 }} animate={{ scale: [1, 1.15, 1] }} exit={{ scale: 0 }} transition={{ scale: { duration: 1, repeat: Infinity } }}>
              <Mic className="w-9 h-9 text-primary-foreground" />
            </motion.div>
          )}
          {visualState === "thinking" && (
            <motion.div key="t" initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: 360 }} exit={{ opacity: 0 }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" } }}>
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </motion.div>
          )}
          {visualState === "speaking" && (
            <motion.div key="s" initial={{ scale: 0.8 }} animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ height: [6, 18, 6] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }} className="w-1.5 bg-primary-foreground rounded-full" />
                ))}
              </div>
            </motion.div>
          )}
          {visualState === "idle" && (
            <motion.div key="i" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Mic className="w-9 h-9 text-primary-foreground/50" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── State label ───
function StateLabel({ state, holding }: { state: VoiceState; holding: boolean }) {
  const label = holding ? "Parlez maintenant…"
    : state === "listening" ? "Je vous écoute…"
    : state === "thinking" ? "Je réfléchis…"
    : state === "speaking" ? "Alex parle…"
    : "Maintenez pour parler";

  return (
    <motion.p key={`${state}-${holding}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="text-sm text-muted-foreground font-medium tracking-wide text-center">
      {label}
    </motion.p>
  );
}

// ─── Transcript bubble ───
function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  if (!text) return null;
  const isUser = role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl px-4 py-3 max-w-[85%] ${isUser ? "self-end bg-primary/10" : "self-start bg-card border border-border/50"}`}>
      {!isUser && <span className="text-[11px] font-semibold text-primary mb-0.5 block">Alex</span>}
      <p className="text-sm leading-relaxed text-foreground">{text}</p>
    </motion.div>
  );
}

export default function AlexCommandCenterPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [holding, setHolding] = useState(false);
  const [dynamicChips, setDynamicChips] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => cleanupAlexOverlays(), []);

  const dispatcherDeps: DispatcherDeps = {
    navigate,
    onShowChips: (items) => setDynamicChips(items),
  };

  const handleUIAction = useCallback((action: UIAction) => {
    dispatchAlexActions([action as AlexUIAction], dispatcherDeps);
  }, [navigate]);

  const {
    state, messages, transcript, error, isSupported, nextAction,
    startSession, sendMessage, startListening, stopListening, stopPlayback, interrupt, reset,
  } = useAlexVoiceFull({
    onUIAction: handleUIAction,
    currentPage: pathname,
  });

  // Auto-start session
  useEffect(() => { startSession(); }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ─── Hold-to-talk ───
  const handlePointerDown = useCallback(() => {
    if (!isSupported || state === "thinking") return;
    if (state === "speaking") stopPlayback();
    holdTimerRef.current = setTimeout(() => {
      setHolding(true);
      startListening();
    }, 120);
  }, [state, isSupported, startListening, stopPlayback]);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holding) { setHolding(false); stopListening(); }
  }, [holding, stopListening]);

  const handleTap = useCallback(() => {
    if (state === "speaking") stopPlayback();
  }, [state, stopPlayback]);

  const handleTextSend = useCallback(() => {
    const t = textInput.trim();
    if (!t) return;
    setTextInput("");
    sendMessage(t);
  }, [textInput, sendMessage]);

  const handleChipAction = useCallback((chip: typeof OWNER_ACTIONS[0]) => {
    if (chip.action === "open_upload") sendMessage("Je veux envoyer une photo de ma propriété");
    else if (chip.action === "show_score") sendMessage("Montre-moi mon score maison");
    else if (chip.action === "open_booking") sendMessage("Je veux prendre un rendez-vous");
    else handleUIAction({ type: chip.action, target: chip.target } as UIAction);
  }, [handleUIAction, sendMessage]);

  return (
    <>
      <Helmet>
        <title>Alex — Commande vocale | UNPRO</title>
        <meta name="description" content="Parlez à Alex, votre concierge intelligente pour la maison et la rénovation." />
      </Helmet>

      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-sm font-bold text-foreground">Alex</h1>
              <p className="text-[11px] text-muted-foreground">Concierge intelligente</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowText(v => !v)} className="rounded-full h-9 w-9">
              <MessageCircle className="w-4 h-4" />
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="rounded-full text-xs h-8 px-3">
                Nouveau
              </Button>
            )}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col items-center justify-between relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 opacity-25 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 45%, hsl(var(--primary) / 0.08) 0%, transparent 55%)` }} />

          {/* Transcript */}
          <div ref={scrollRef} className="w-full max-w-md flex-shrink-0 max-h-[30vh] overflow-y-auto px-4 pt-4 relative z-10">
            <div className="flex flex-col gap-2">
              {messages.slice(-8).map((msg, i) => (
                <Bubble key={i} role={msg.role} text={msg.content} />
              ))}
            </div>
          </div>

          {/* Orb center */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-0 gap-3">
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={handleTap}
              className="focus:outline-none cursor-pointer select-none touch-none"
              disabled={state === "thinking"}
              aria-label="Maintenez pour parler"
            >
              <CommandOrb state={state} holding={holding} />
            </button>

            {/* Live transcript */}
            <AnimatePresence>
              {transcript && (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-sm text-foreground/60 italic max-w-xs text-center px-4">
                  &ldquo;{transcript}&rdquo;
                </motion.p>
              )}
            </AnimatePresence>

            <StateLabel state={state} holding={holding} />

            {/* Next action */}
            <AnimatePresence>
              {nextAction && state === "idle" && (
                <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  onClick={() => sendMessage(nextAction)}
                  className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" />
                  {nextAction}
                  <ChevronRight className="w-3 h-3" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs text-destructive text-center px-4">{error}</motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Quick action chips */}
          <div className="w-full px-4 pb-2 relative z-10">
            <AnimatePresence>
              {dynamicChips.length > 0 && state === "idle" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="flex flex-wrap justify-center gap-2 mb-2">
                  {dynamicChips.map(chip => (
                    <button key={chip} onClick={() => { setDynamicChips([]); sendMessage(chip); }}
                      className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-medium text-primary hover:bg-primary/20 active:scale-95 transition-all">
                      {chip}<ChevronRight className="w-3 h-3" />
                    </button>
                  ))}
                </motion.div>
              )}
              {state === "idle" && messages.length <= 1 && dynamicChips.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="flex flex-wrap justify-center gap-2">
                  {OWNER_ACTIONS.map(chip => (
                    <button key={chip.label} onClick={() => handleChipAction(chip)}
                      className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/80 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/10 hover:border-primary/30 active:scale-95 transition-all">
                      <chip.icon className="w-3.5 h-3.5 text-primary" />
                      {chip.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="px-4 pb-6 pt-2 space-y-3 border-t border-border/15 bg-background/90 backdrop-blur-sm">
          <AnimatePresence>
            {showText && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2">
                <Input value={textInput} onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleTextSend()}
                  placeholder="Écrire à Alex…" className="flex-1 rounded-full bg-muted/50 h-10"
                  disabled={state === "thinking"} />
                <Button size="icon" onClick={handleTextSend} disabled={!textInput.trim() || state === "thinking"} className="rounded-full h-10 w-10">
                  <Send className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-4">
            {state === "speaking" && (
              <Button variant="outline" size="sm" onClick={stopPlayback} className="rounded-full gap-2 h-9">
                <VolumeX className="w-4 h-4" />Arrêter
              </Button>
            )}
            <div className="flex flex-col items-center gap-1">
              <Button
                variant={state === "listening" || holding ? "destructive" : "default"}
                size="lg"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                disabled={state === "thinking" || !isSupported}
                className="rounded-full w-16 h-16 shadow-lg"
                aria-label="Maintenez pour parler"
              >
                {state === "listening" || holding ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              <span className="text-[10px] text-muted-foreground">{holding ? "Relâchez" : "Maintenez"}</span>
            </div>
          </div>

          {!isSupported && (
            <p className="text-xs text-center text-muted-foreground">La reconnaissance vocale nécessite Chrome ou Safari.</p>
          )}
        </div>
      </div>
    </>
  );
}
