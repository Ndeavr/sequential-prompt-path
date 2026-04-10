/**
 * OverlayAlexVoiceFullScreen — Locked full-screen voice overlay.
 * 
 * RULES:
 * - Mounted at app root level, outside fragile subtrees
 * - Cannot be closed by any automatic mechanism
 * - Only user-initiated close or fatal error
 * - 4-second stabilization window blocks all auto-close
 * - Heartbeat keeps session alive
 * 
 * FIX V5: All timeouts/async use getState() instead of stale store snapshot.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PhoneOff, RefreshCw, AlertCircle, MessageSquare, Sparkles, WifiOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexVoiceLockedStore, type LockedVoiceState } from "@/stores/alexVoiceLockedStore";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { audioEngine } from "@/services/audioEngineUNPRO";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/unpro-robot.png";

const STABILIZATION_MS = 4000;
const HEARTBEAT_INTERVAL_MS = 2000;
const BOOT_TIMEOUT_MS = 10000;
const FIRST_AUDIO_TIMEOUT_MS = 5000;

// Helper to always get fresh state
const getStore = () => useAlexVoiceLockedStore.getState();

export default function OverlayAlexVoiceFullScreen() {
  const store = useAlexVoiceLockedStore();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stabilizationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ id: string; role: "user" | "alex"; text: string }>>([]);
  const entryIdRef = useRef(0);
  const lastAlexIdRef = useRef<string | null>(null);
  const hasConnectedRef = useRef(false);
  const firstAudioReceivedRef = useRef(false);
  const bootTimeRef = useRef<number>(0);
  const [bootStep, setBootStep] = useState<string>("init");

  const firstName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(" ")[0]
    || null;

  // Build greeting
  const buildGreeting = useCallback(() => {
    const hour = new Date().getHours();
    const time = hour >= 5 && hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    const name = firstName ? `${time} ${firstName}.` : `${time}.`;
    return `${name} Que puis-je faire pour vous?`;
  }, [firstName]);

  // Gemini Live voice
  const { start, stop, isActive, isConnecting, isSpeaking } = useLiveVoice({
    onFirstAudio: () => {
      firstAudioReceivedRef.current = true;
      if (firstAudioTimerRef.current) {
        clearTimeout(firstAudioTimerRef.current);
        firstAudioTimerRef.current = null;
      }

      setBootStep("live");

      const s = getStore();
      if (!s.isOverlayOpen) return;

      const current = s.machineState;
      if (["stabilizing", "opening_session", "session_ready", "listening", "awaiting_user"].includes(current)) {
        if (current === "stabilizing" || current === "opening_session") {
          s.transitionTo("session_ready", "first_audio_frame");
        }
        s.transitionTo("speaking", "first_audio_frame");
      }
    },
    onTranscript: (text) => {
      const s = getStore();
      if (!s.isOverlayOpen) return;
      
      // Transition to speaking if we're in any "waiting" state
      const current = s.machineState;
      if (["stabilizing", "opening_session", "session_ready", "listening", "awaiting_user"].includes(current)) {
        if (current === "stabilizing" || current === "opening_session") {
          s.transitionTo("session_ready", "first_audio_received");
        }
        s.transitionTo("speaking", "alex_speaking");
      }

      s.addTranscript("alex", text);

      setTranscripts(prev => {
        const last = prev.length > 0 && prev[prev.length - 1].role === "alex" ? prev[prev.length - 1] : null;
        if (last && last.id === lastAlexIdRef.current) {
          return prev.map(e => e.id === last.id ? { ...e, text: e.text + text } : e);
        }
        const newId = `alex-${++entryIdRef.current}`;
        lastAlexIdRef.current = newId;
        return [...prev, { role: "alex" as const, text, id: newId }];
      });
    },
    onUserTranscript: (text) => {
      const s = getStore();
      if (!s.isOverlayOpen || !text || text.trim().length < 2) return;
      lastAlexIdRef.current = null;
      
      const current = s.machineState;
      if (["listening", "awaiting_user", "session_ready"].includes(current)) {
        s.transitionTo("capturing_voice", "user_speaking");
      }

      s.addTranscript("user", text);
      setTranscripts(prev => [
        ...prev,
        { role: "user" as const, text, id: `user-${++entryIdRef.current}` },
      ]);
    },
    onConnect: () => {
      console.log("[VoiceOverlay] ✅ Gemini connected");
      hasConnectedRef.current = true;
      bootTimeRef.current = Date.now();
      setBootStep("connected");
      getStore().resetHeartbeat();
    },
    onDisconnect: () => {
      const s = getStore();
      console.warn("[VoiceOverlay] Gemini disconnected. state:", s.machineState);
      hasConnectedRef.current = false;
      firstAudioReceivedRef.current = false;
      if (firstAudioTimerRef.current) {
        clearTimeout(firstAudioTimerRef.current);
        firstAudioTimerRef.current = null;
      }
      const timeSinceBoot = Date.now() - bootTimeRef.current;
      if (s.isOverlayOpen && hasConnectedRef.current && timeSinceBoot > 2000) {
        s.setError("connection_lost", "Connexion perdue. Réessayez ou passez au chat.", true);
      } else if (s.isOverlayOpen && !hasConnectedRef.current) {
        s.setError("connection_failed", "Impossible de se connecter. Réessayez.", true);
      }
    },
    onError: (error) => {
      console.error("[VoiceOverlay] Error:", error);
      const s = getStore();
      if (s.isOverlayOpen) {
        const rawMessage = (error as any)?.message || "Erreur de connexion vocale.";
        const msg = rawMessage.includes("moteur vocal") || rawMessage.includes("serveur vocal")
          ? rawMessage
          : rawMessage.includes("not available") || rawMessage.includes("bidiGenerateContent")
          ? "Le moteur vocal est indisponible pour le moment. Passez au chat ou réessayez."
          : rawMessage;
        s.setError("voice_error", msg, true);
      }
    },
  });

  // Sync speaking/listening states
  useEffect(() => {
    if (!isActive || !store.isOverlayOpen) return;
    const s = getStore();
    if (isSpeaking) {
      if (["listening", "awaiting_user", "session_ready", "capturing_voice"].includes(s.machineState)) {
        s.transitionTo("speaking", "gemini_speaking");
      }
    } else if (hasConnectedRef.current) {
      if (s.machineState === "speaking") {
        s.transitionTo("awaiting_user", "gemini_done_speaking");
        setTimeout(() => {
          const latest = getStore();
          if (latest.machineState === "awaiting_user") {
            latest.transitionTo("listening", "awaiting_to_listening");
          }
        }, 300);
      }
    }
  }, [isSpeaking, isActive]);

  // ─── BOOT SEQUENCE when overlay opens ───
  useEffect(() => {
    if (!store.isOverlayOpen || store.machineState !== "requesting_permission") return;

    let cancelled = false;
    let bootTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const boot = async () => {
      try {
        setBootStep("opening");
        hasConnectedRef.current = false;
        firstAudioReceivedRef.current = false;
        if (firstAudioTimerRef.current) {
          clearTimeout(firstAudioTimerRef.current);
          firstAudioTimerRef.current = null;
        }
        getStore().transitionTo("opening_session", "boot_start");

        // Unlock audio and play intro
        audioEngine.unlock();
        void audioEngine.play("intro").catch(() => {});

        if (cancelled) return;

        setBootStep("stabilizing");
        getStore().transitionTo("stabilizing", "stabilization_start");

        // HARD boot timeout — uses getState() for fresh check
        bootTimeoutId = setTimeout(() => {
          if (cancelled) return;
          const s = getStore();
          const isStuck = s.isOverlayOpen && 
            ["stabilizing", "opening_session", "requesting_permission"].includes(s.machineState);
          if (isStuck) {
            console.error("[VoiceOverlay] ⏱️ Boot timeout — forcing error state");
            s.setError("boot_timeout", "La connexion prend trop de temps. Réessayez ou passez au chat.", true);
          }
        }, BOOT_TIMEOUT_MS);

        // Connect Gemini Live
        setBootStep("connecting");
        const greeting = buildGreeting();
        console.log("[VoiceOverlay] Starting Gemini Live with greeting:", greeting);
        await start({ initialGreeting: greeting });

        if (cancelled) return;

        setBootStep("waiting_audio");
        firstAudioTimerRef.current = setTimeout(() => {
          if (cancelled) return;
          const s = getStore();
          if (!firstAudioReceivedRef.current && s.isOverlayOpen && ["stabilizing", "opening_session", "session_ready"].includes(s.machineState)) {
            s.setError("no_first_audio", "Alex ne parle pas. Réessayez ou passez au chat.", true);
          }
        }, FIRST_AUDIO_TIMEOUT_MS);

        // Stabilization timer — uses getState() for fresh check
        stabilizationTimerRef.current = setTimeout(() => {
          const s = getStore();
          if (firstAudioReceivedRef.current && s.machineState === "stabilizing") {
            s.transitionTo("session_ready", "stabilization_complete_after_audio");
          }
        }, STABILIZATION_MS);

      } catch (err: any) {
        if (cancelled) return;
        console.error("[VoiceOverlay] Boot failed:", err);
        setBootStep("error");
        const s = getStore();
        if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
          s.setError("permission_denied", "Autorisez le microphone pour continuer.", false);
        } else {
          s.setError("boot_failed", err?.message || "Impossible de démarrer la voix. Réessayez.", true);
        }
      }
    };

    boot();

    return () => {
      cancelled = true;
      if (bootTimeoutId) clearTimeout(bootTimeoutId);
      if (firstAudioTimerRef.current) {
        clearTimeout(firstAudioTimerRef.current);
        firstAudioTimerRef.current = null;
      }
    };
  }, [store.isOverlayOpen, store.machineState === "requesting_permission"]);

  // ─── HEARTBEAT ───
  useEffect(() => {
    if (!store.isOverlayOpen) return;

    heartbeatRef.current = setInterval(() => {
      const timeSinceBoot = Date.now() - bootTimeRef.current;
      if (timeSinceBoot < 15000) return;
      
      const s = getStore();
      if (!isActive && hasConnectedRef.current && s.isOverlayOpen) {
        s.incrementHeartbeatFailure();
      } else {
        s.resetHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [store.isOverlayOpen, isActive]);

  // ─── CLEANUP on overlay close ───
  useEffect(() => {
    if (!store.isOverlayOpen) {
      if (stabilizationTimerRef.current) clearTimeout(stabilizationTimerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (firstAudioTimerRef.current) clearTimeout(firstAudioTimerRef.current);
      if (isActive) {
        try { audioEngine.play("outro"); } catch {}
        stop();
      }
      hasConnectedRef.current = false;
      firstAudioReceivedRef.current = false;
      setTranscripts([]);
      entryIdRef.current = 0;
      lastAlexIdRef.current = null;
      setBootStep("init");
    }
  }, [store.isOverlayOpen]);

  // ─── Block alex-voice-cleanup from killing THIS session ───
  useEffect(() => {
    const handler = (e: Event) => {
      if (getStore().isOverlayOpen) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("alex-voice-cleanup", handler, true);
    return () => window.removeEventListener("alex-voice-cleanup", handler, true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcripts]);

  // ─── HANDLERS ───
  const handleClose = useCallback(() => {
    getStore().closeVoiceSession("user_explicit_close");
  }, []);

  const handleRetry = useCallback(async () => {
    const s = getStore();
    stop();
    s.clearError();
    s.transitionTo("opening_session", "retry");
    hasConnectedRef.current = false;
    firstAudioReceivedRef.current = false;
    if (firstAudioTimerRef.current) {
      clearTimeout(firstAudioTimerRef.current);
      firstAudioTimerRef.current = null;
    }
    setBootStep("connecting");
    try {
      s.transitionTo("stabilizing", "retry_stabilization");
      const greeting = buildGreeting();
      await start({ initialGreeting: greeting });
      setBootStep("waiting_audio");
      firstAudioTimerRef.current = setTimeout(() => {
        const latest = getStore();
        if (!firstAudioReceivedRef.current && latest.isOverlayOpen && ["stabilizing", "opening_session", "session_ready"].includes(latest.machineState)) {
          latest.setError("no_first_audio", "Alex ne parle pas. Réessayez ou passez au chat.", true);
        }
      }, FIRST_AUDIO_TIMEOUT_MS);
      stabilizationTimerRef.current = setTimeout(() => {
        const latest = getStore();
        if (firstAudioReceivedRef.current && latest.machineState === "stabilizing") {
          latest.transitionTo("session_ready", "retry_stabilization_complete_after_audio");
        }
      }, STABILIZATION_MS);
    } catch (err: any) {
      getStore().setError("retry_failed", "Impossible de reconnecter. Passez au chat.", true);
    }
  }, [buildGreeting, start]);

  const handleFallbackChat = useCallback(() => {
    getStore().closeVoiceSession("fallback_to_chat");
  }, []);

  if (!store.isOverlayOpen) return null;

  const state = store.machineState;
  const isError = state === "error_recoverable" || state === "error_fatal";
  const isStabilizing = state === "stabilizing" || state === "opening_session" || state === "requesting_permission";
  const isSessionActive = ["session_ready", "listening", "capturing_voice", "processing_stt", "processing_response", "speaking", "awaiting_user"].includes(state);

  const statusText =
    isError ? (store.errorMessage || "Erreur")
    : isStabilizing ? getBootStepLabel(bootStep)
    : state === "listening" || state === "awaiting_user" ? "Je vous écoute…"
    : state === "capturing_voice" ? "Vous parlez…"
    : state === "processing_stt" || state === "processing_response" ? "Réflexion…"
    : state === "speaking" ? "Alex parle…"
    : "Session vocale";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col bg-background"
      >
        <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
        
        <div className="relative flex flex-col h-full z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 bg-card/60">
                  <img src={logo} alt="Alex" className="w-full h-full object-contain" />
                </div>
                {isSessionActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background bg-primary" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground font-display">Alex Voice</h2>
                <p className="text-[10px] text-muted-foreground">{statusText}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Boot checklist during connection */}
          {isStabilizing && (
            <div className="px-6 py-4">
              <BootChecklist step={bootStep} />
            </div>
          )}

          {/* Transcripts */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-lg mx-auto flex flex-col gap-3">
              {transcripts.map(entry => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                    entry.role === "user"
                      ? "self-end bg-primary/10 text-foreground"
                      : "self-start bg-card border border-border/40 text-foreground"
                  }`}
                >
                  {entry.role === "alex" && (
                    <span className="text-xs font-semibold text-primary mb-1 block">Alex</span>
                  )}
                  <p className="text-sm leading-relaxed">{entry.text}</p>
                </motion.div>
              ))}

              {transcripts.length === 0 && !isStabilizing && isSessionActive && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Alex est prête. Parlez…</p>
                </div>
              )}
            </div>
          </div>

          {/* Voice Orb */}
          <div className="flex flex-col items-center py-6">
            <LockedVoiceOrb state={state} isSpeaking={isSpeaking} />
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {isError && store.errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-4 mb-2 flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-xs"
              >
                {store.heartbeatFailures >= 3 ? <WifiOff className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span className="flex-1">{store.errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="px-4 pb-6 pt-3 flex items-center justify-center gap-3 border-t border-border/20">
            {isError ? (
              <>
                <Button onClick={handleRetry} className="rounded-full gap-2 px-6" variant="default">
                  <RefreshCw className="w-4 h-4" /> Réessayer
                </Button>
                <Button onClick={handleFallbackChat} variant="outline" className="rounded-full gap-2 px-6">
                  <MessageSquare className="w-4 h-4" /> Passer au chat
                </Button>
              </>
            ) : isStabilizing ? (
              <div className="flex gap-3">
                <Button disabled className="rounded-full gap-2 px-6" variant="default">
                  <Sparkles className="w-4 h-4 animate-spin" /> Connexion…
                </Button>
                <Button onClick={handleFallbackChat} variant="outline" className="rounded-full gap-2 px-4">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button onClick={handleClose} variant="destructive" className="rounded-full gap-2 px-8">
                  <PhoneOff className="w-5 h-5" /> Raccrocher
                </Button>
                <Button onClick={handleFallbackChat} variant="outline" size="icon" className="rounded-full">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Boot Step Label ───
function getBootStepLabel(step: string): string {
  switch (step) {
    case "init": return "Initialisation…";
    case "opening": return "Ouverture session…";
    case "stabilizing": return "Préparation…";
    case "connecting": return "Connexion au serveur vocal…";
    case "connected": return "Serveur connecté ✓";
    case "waiting_audio": return "En attente du premier son…";
    case "live": return "Premier contact vocal ✓";
    case "error": return "Erreur de démarrage";
    default: return "Préparation…";
  }
}

// ─── Boot Checklist ───
function BootChecklist({ step }: { step: string }) {
  const steps = [
    { key: "opening", label: "Ouverture de session" },
    { key: "stabilizing", label: "Préparation audio" },
    { key: "connecting", label: "Connexion serveur vocal" },
    { key: "connected", label: "Serveur connecté" },
    { key: "waiting_audio", label: "Premier contact vocal" },
  ];

  const stepOrder = ["init", "opening", "stabilizing", "connecting", "connected", "waiting_audio", "live"];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const sIdx = stepOrder.indexOf(s.key);
        const isDone = currentIdx > sIdx;
        const isCurrent = currentIdx === sIdx;
        
        return (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            {isDone ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            ) : isCurrent ? (
              <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30" />
            )}
            <span className={isDone ? "text-foreground" : isCurrent ? "text-primary font-medium" : "text-muted-foreground/50"}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Locked Voice Orb ───
function LockedVoiceOrb({ state, isSpeaking }: { state: LockedVoiceState; isSpeaking: boolean }) {
  const isActive = ["session_ready", "listening", "capturing_voice", "speaking", "awaiting_user", "processing_stt", "processing_response"].includes(state);
  const isConnecting = ["stabilizing", "opening_session", "requesting_permission"].includes(state);
  const isError = state === "error_recoverable" || state === "error_fatal";

  const baseSize = isActive ? (isSpeaking ? 170 : 160) : isConnecting ? 140 : 120;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Outer glow ring */}
      {isActive && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: baseSize + 40,
            height: baseSize + 40,
            background: `radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)`,
          }}
          animate={isSpeaking ? {
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.8, 0.4],
          } : {
            scale: [1, 1.05, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: isSpeaking ? 0.8 : 2, repeat: Infinity }}
        />
      )}

      {/* Core orb */}
      <motion.div
        className="rounded-full flex items-center justify-center overflow-hidden"
        style={{
          width: baseSize,
          height: baseSize,
          background: isError
            ? `radial-gradient(circle at 40% 40%, hsl(var(--destructive) / 0.3), hsl(var(--destructive) / 0.1))`
            : isConnecting
            ? `radial-gradient(circle at 40% 40%, hsl(var(--primary) / 0.2), hsl(var(--muted) / 0.3))`
            : `radial-gradient(circle at 40% 40%, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.15))`,
          border: `2px solid ${isError ? 'hsl(var(--destructive) / 0.4)' : 'hsl(var(--primary) / 0.3)'}`,
          boxShadow: isActive
            ? `0 0 40px hsl(var(--primary) / 0.2), inset 0 0 30px hsl(var(--primary) / 0.1)`
            : 'none',
        }}
        animate={isConnecting ? {
          scale: [1, 1.05, 1],
          opacity: [0.7, 1, 0.7],
        } : isSpeaking ? {
          scale: [1, 1.08, 1],
        } : {}}
        transition={{ duration: isConnecting ? 1.5 : 0.6, repeat: Infinity }}
      >
        <img src={logo} alt="Alex" className="w-2/3 h-2/3 object-contain opacity-80" />
      </motion.div>
    </div>
  );
}
