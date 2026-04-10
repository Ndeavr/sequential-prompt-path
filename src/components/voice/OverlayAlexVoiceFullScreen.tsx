/**
 * OverlayAlexVoiceFullScreen — Locked full-screen voice overlay.
 * 
 * RULES:
 * - Mounted at app root level, outside fragile subtrees
 * - Cannot be closed by any automatic mechanism
 * - Only user-initiated close or fatal error
 * - 4-second stabilization window blocks all auto-close
 * - Heartbeat keeps session alive
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Phone, PhoneOff, RefreshCw, AlertCircle, MessageSquare, Sparkles, Square, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexVoiceLockedStore, type LockedVoiceState } from "@/stores/alexVoiceLockedStore";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { audioEngine } from "@/services/audioEngineUNPRO";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/unpro-robot.png";

const STABILIZATION_MS = 4000;
const HEARTBEAT_INTERVAL_MS = 2000;

export default function OverlayAlexVoiceFullScreen() {
  const store = useAlexVoiceLockedStore();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stabilizationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ id: string; role: "user" | "alex"; text: string }>>([]);
  const entryIdRef = useRef(0);
  const lastAlexIdRef = useRef<string | null>(null);
  const hasConnectedRef = useRef(false);

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
    onTranscript: (text) => {
      if (!store.isOverlayOpen) return;
      
      // Update store state
      if (store.machineState === "stabilizing" || store.machineState === "opening_session") {
        store.transitionTo("session_ready", "first_audio_received");
        store.transitionTo("speaking", "alex_greeting");
      } else if (store.machineState === "listening" || store.machineState === "awaiting_user") {
        store.transitionTo("speaking", "alex_response");
      }

      store.addTranscript("alex", text);

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
      if (!store.isOverlayOpen || !text || text.trim().length < 2) return;
      lastAlexIdRef.current = null;
      
      if (store.machineState === "listening" || store.machineState === "awaiting_user") {
        store.transitionTo("capturing_voice", "user_speaking");
      }

      store.addTranscript("user", text);
      setTranscripts(prev => [
        ...prev,
        { role: "user" as const, text, id: `user-${++entryIdRef.current}` },
      ]);
    },
    onConnect: () => {
      console.log("[VoiceOverlay] ✅ Gemini connected");
      hasConnectedRef.current = true;
      store.resetHeartbeat();
    },
    onDisconnect: () => {
      console.warn("[VoiceOverlay] Gemini disconnected. isOverlayOpen:", store.isOverlayOpen, "state:", store.machineState);
      if (store.isOverlayOpen) {
        // ALWAYS show error on disconnect — don't silently swallow during stabilization
        store.setError("connection_lost", "Connexion perdue. Réessayez ou passez au chat.", true);
      }
    },
    onError: (error) => {
      console.error("[VoiceOverlay] Error:", error);
      if (store.isOverlayOpen) {
        const msg = (error as any)?.message || "Erreur de connexion vocale.";
        store.setError("voice_error", msg, true);
      }
    },
  });

  // Sync speaking/listening states
  useEffect(() => {
    if (!isActive || !store.isOverlayOpen) return;
    if (isSpeaking) {
      if (store.machineState === "listening" || store.machineState === "awaiting_user" || store.machineState === "session_ready") {
        store.transitionTo("speaking", "gemini_speaking");
      }
    } else if (hasConnectedRef.current) {
      if (store.machineState === "speaking") {
        store.transitionTo("awaiting_user", "gemini_done_speaking");
        // Auto-transition to listening
        setTimeout(() => {
          if (store.machineState === "awaiting_user") {
            store.transitionTo("listening", "awaiting_to_listening");
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
        // 1. Transition to opening
        store.transitionTo("opening_session", "boot_start");

        // 2. Unlock audio and play intro without blocking voice boot
        audioEngine.unlock();
        void audioEngine.play("intro").catch(() => {});

        if (cancelled) return;

        // 3. Enter stabilization (4s no-close window)
        store.transitionTo("stabilizing", "stabilization_start");

        // 4. Set a HARD boot timeout — if nothing happens in 12s, force error
        bootTimeoutId = setTimeout(() => {
          if (!cancelled && store.isOverlayOpen && 
              (store.machineState === "stabilizing" || store.machineState === "opening_session")) {
            console.error("[VoiceOverlay] ⏱️ Boot timeout — forcing error state");
            store.setError("boot_timeout", "La connexion prend trop de temps. Réessayez.", true);
          }
        }, 12000);

        // 5. Connect Gemini Live
        const greeting = buildGreeting();
        console.log("[VoiceOverlay] Starting Gemini Live with greeting:", greeting);
        await start({ initialGreeting: greeting });

        if (cancelled) return;

        // 6. Stabilization timer
        stabilizationTimerRef.current = setTimeout(() => {
          if (store.machineState === "stabilizing") {
            store.transitionTo("session_ready", "stabilization_complete");
            store.transitionTo("listening", "ready_to_listen");
          }
        }, STABILIZATION_MS);

      } catch (err: any) {
        if (cancelled) return;
        console.error("[VoiceOverlay] Boot failed:", err);
        if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
          store.setError("permission_denied", "Autorisez le microphone pour continuer.", false);
        } else {
          store.setError("boot_failed", err?.message || "Impossible de démarrer la voix. Réessayez.", true);
        }
      }
    };

    boot();

    return () => {
      cancelled = true;
      if (bootTimeoutId) clearTimeout(bootTimeoutId);
    };
  }, [store.isOverlayOpen, store.machineState === "requesting_permission"]);

  // ─── HEARTBEAT ───
  useEffect(() => {
    if (!store.isOverlayOpen) return;

    heartbeatRef.current = setInterval(() => {
      if (!isActive && hasConnectedRef.current && store.isOverlayOpen) {
        store.incrementHeartbeatFailure();
      } else {
        store.resetHeartbeat();
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
      if (isActive) {
        try { audioEngine.play("outro"); } catch {}
        stop();
      }
      hasConnectedRef.current = false;
      setTranscripts([]);
      entryIdRef.current = 0;
      lastAlexIdRef.current = null;
    }
  }, [store.isOverlayOpen]);

  // ─── Block alex-voice-cleanup from killing THIS session ───
  useEffect(() => {
    const handler = (e: Event) => {
      if (store.isOverlayOpen) {
        e.stopImmediatePropagation();
        console.warn("[VoiceOverlay] Blocked alex-voice-cleanup — locked session active");
      }
    };
    // Use capture to intercept before useLiveVoice's listener
    window.addEventListener("alex-voice-cleanup", handler, true);
    return () => window.removeEventListener("alex-voice-cleanup", handler, true);
  }, [store.isOverlayOpen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcripts]);

  // ─── HANDLERS ───
  const handleClose = useCallback(() => {
    store.closeVoiceSession("user_explicit_close");
  }, []);

  const handleRetry = useCallback(async () => {
    store.clearError();
    store.transitionTo("opening_session", "retry");
    hasConnectedRef.current = false;
    try {
      store.transitionTo("stabilizing", "retry_stabilization");
      const greeting = buildGreeting();
      await start({ initialGreeting: greeting });
      stabilizationTimerRef.current = setTimeout(() => {
        if (store.machineState === "stabilizing") {
          store.transitionTo("session_ready", "retry_stabilization_complete");
          store.transitionTo("listening", "retry_ready");
        }
      }, STABILIZATION_MS);
    } catch (err: any) {
      store.setError("retry_failed", "Impossible de reconnecter.", true);
    }
  }, [buildGreeting, start]);

  const handleFallbackChat = useCallback(() => {
    store.closeVoiceSession("fallback_to_chat");
    // TODO: inject transcripts into chat context
  }, []);

  if (!store.isOverlayOpen) return null;

  const state = store.machineState;
  const isError = state === "error_recoverable" || state === "error_fatal";
  const isStabilizing = state === "stabilizing" || state === "opening_session" || state === "requesting_permission";
  const isSessionActive = ["session_ready", "listening", "capturing_voice", "processing_stt", "processing_response", "speaking", "awaiting_user"].includes(state);

  const statusText =
    isStabilizing ? "Alex se connecte…"
    : state === "listening" || state === "awaiting_user" ? "Je vous écoute…"
    : state === "capturing_voice" ? "Vous parlez…"
    : state === "processing_stt" || state === "processing_response" ? "Réflexion…"
    : state === "speaking" ? "Alex parle…"
    : state === "error_recoverable" ? "Reconnexion…"
    : state === "error_fatal" ? "Erreur"
    : "Session vocale";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col bg-background"
      >
        {/* Backdrop blur effect */}
        <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
        
        {/* Content */}
        <div className="relative flex flex-col h-full z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 bg-card/60">
                  <img src={logo} alt="Alex" className="w-full h-full object-contain" />
                </div>
                {isSessionActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background" style={{ backgroundColor: "hsl(var(--primary))" }} />
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

              {transcripts.length === 0 && isStabilizing && (
                <div className="text-center py-8">
                  <Sparkles className="w-6 h-6 text-primary/50 mx-auto mb-2 animate-spin" />
                  <p className="text-sm text-muted-foreground">Alex se prépare…</p>
                </div>
              )}
            </div>
          </div>

          {/* Voice Orb */}
          <div className="flex flex-col items-center py-6">
            <LockedVoiceOrb state={state} isSpeaking={isSpeaking} />
            <p className="mt-3 text-sm text-muted-foreground font-medium">{statusText}</p>
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
                {state === "error_fatal" && (
                  <Button onClick={handleClose} variant="ghost" className="rounded-full gap-2 px-6">
                    <X className="w-4 h-4" /> Fermer
                  </Button>
                )}
              </>
            ) : isStabilizing ? (
              <Button disabled className="rounded-full gap-2 px-8" variant="default">
                <Sparkles className="w-5 h-5 animate-spin" /> Connexion…
              </Button>
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

// ─── Locked Voice Orb ───
function LockedVoiceOrb({ state, isSpeaking }: { state: LockedVoiceState; isSpeaking: boolean }) {
  const isActive = ["session_ready", "listening", "capturing_voice", "speaking", "awaiting_user", "processing_stt", "processing_response"].includes(state);
  const isConnecting = ["stabilizing", "opening_session", "requesting_permission"].includes(state);
  const isError = state === "error_recoverable" || state === "error_fatal";

  const baseSize = isActive ? (isSpeaking ? 170 : 160) : isConnecting ? 140 : 120;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Outer glow */}
      <motion.div
        animate={{
          scale: isActive ? (isSpeaking ? [1, 1.2, 1] : [1, 1.15, 1]) : 1,
          opacity: isActive ? 0.4 : 0.15,
        }}
        transition={{ duration: isSpeaking ? 0.8 : 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full"
        style={{
          width: baseSize + 80,
          height: baseSize + 80,
          background: `radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)`,
        }}
      />

      {/* Core orb */}
      <motion.div
        animate={{
          width: baseSize,
          height: baseSize,
          scale: isConnecting ? [1, 0.92, 1] : isSpeaking ? [1, 1.05, 1] : 1,
        }}
        transition={{
          width: { type: "spring", stiffness: 200, damping: 20 },
          height: { type: "spring", stiffness: 200, damping: 20 },
          scale: { duration: isConnecting ? 0.6 : 0.8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: isError
            ? `radial-gradient(circle at 35% 35%, hsl(var(--destructive) / 0.6), hsl(var(--destructive) / 0.3))`
            : isActive
            ? `radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.6))`
            : `radial-gradient(circle at 35% 35%, hsl(var(--muted-foreground) / 0.4), hsl(var(--muted-foreground) / 0.2))`,
          boxShadow: `0 0 ${isActive ? 40 : 15}px hsl(var(--primary) / ${isActive ? 0.3 : 0.1})`,
        }}
      >
        <AnimatePresence mode="wait">
          {isActive && !isSpeaking && (
            <motion.div key="listening" initial={{ scale: 0 }} animate={{ scale: [1, 1.15, 1] }} exit={{ scale: 0 }} transition={{ scale: { duration: 1.2, repeat: Infinity } }}>
              <Mic className="w-10 h-10 text-primary-foreground" />
            </motion.div>
          )}
          {isActive && isSpeaking && (
            <motion.div key="speaking" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map(i => (
                  <motion.div key={i} animate={{ height: [6, 22, 6] }} transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }} className="w-1.5 bg-primary-foreground rounded-full" />
                ))}
              </div>
            </motion.div>
          )}
          {isConnecting && (
            <motion.div key="connecting" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-9 h-9 text-primary-foreground/80" />
            </motion.div>
          )}
          {isError && (
            <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <AlertCircle className="w-9 h-9 text-destructive-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
