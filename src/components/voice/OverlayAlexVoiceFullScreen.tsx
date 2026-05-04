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
import { useEffect, useRef, useCallback, useState, type MutableRefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PhoneOff, RefreshCw, AlertCircle, MessageSquare, Sparkles, WifiOff, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexVoiceLockedStore, type LockedVoiceState } from "@/stores/alexVoiceLockedStore";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { useAlexVoiceRecovery, type RecoveryPhase } from "@/hooks/useAlexVoiceRecovery";
import { executeHardReset } from "@/services/voiceHardResetEngine";
// audioEngine removed — no chimes in voice mode, prevents click artifacts
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import UnproIcon from "@/components/brand/UnproIcon";
import { alexVoiceService } from "@/services/alexVoiceService";
import { useAlexChatFallbackStore } from "@/stores/alexChatFallbackStore";
import {
  lockRuntime,
  unlockRuntime,
  getActiveSessionId,
} from "@/services/voiceRuntimeSingleton";

const STABILIZATION_MS = 4000;
const HEARTBEAT_INTERVAL_MS = 2500; // Slower → less battery
const BOOT_TIMEOUT_MS = 25000; // Cold-start absorbing (edge function + ElevenLabs handshake)
const FIRST_AUDIO_TIMEOUT_MS = 3000; // Spec: auto-retry after 3s
const TOKEN_SLOW_THRESHOLD_MS = 2000; // Spec: show "Connexion d'Alex…" if >2s
const MAX_AUTO_RETRIES = 2; // 1 boot + 2 silent = 3 attempts → fallback chat

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
  const [slowToken, setSlowToken] = useState(false);
  const slowTokenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string>("");
  const entryIdRef = useRef(0);
  const lastAlexIdRef = useRef<string | null>(null);
  const hasConnectedRef = useRef(false);
  const firstAudioReceivedRef = useRef(false);
  const bootTimeRef = useRef<number>(0);
  const [bootStep, setBootStep] = useState<string>("init");
  const bootInitiatedRef = useRef(false);
  const autoRetryCountRef = useRef(0);
  const startRef = useRef<typeof start>(null as any);
  const buildGreetingRef = useRef<typeof buildGreeting>(null as any);
  const transcriptsRef = useRef<typeof transcripts>([]);
  transcriptsRef.current = transcripts;
  const openChatFallback = useAlexChatFallbackStore((s) => s.open);

  // Voice recovery hook
  const recovery = useAlexVoiceRecovery();

  const firstName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(" ")[0]
    || null;

  // Build greeting — personality-driven
  const buildGreeting = useCallback(() => {
    const hour = new Date().getHours();
    const time = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
    const name = firstName ? ` ${firstName}` : "";
    
    // Use contextHint from store for contextual greeting
    const hint = getStore().contextHint;
    if (hint) {
      return `${time}${name}. Je vois que vous regardez ${hint}. On avance ensemble.`;
    }
    if (firstName) {
      return `${time} ${firstName}. Quel projet avance aujourd'hui?`;
    }
    return `${time}. Décrivez votre besoin.`;
  }, [firstName]);

  // ElevenLabs voice
  const { start, stop, isActive, isConnecting, isSpeaking } = useLiveVoice({
    onFirstAudio: () => {
      firstAudioReceivedRef.current = true;
      autoRetryCountRef.current = 0;
      alexVoiceService.setState("speaking", "first_audio");
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
      console.log("[VoiceOverlay] ✅ ElevenLabs connected");
      hasConnectedRef.current = true;
      bootTimeRef.current = Date.now();
      setBootStep("connected");
      alexVoiceService.markWsConnected(true);
      alexVoiceService.setState("connected", "ws_open");
      getStore().resetHeartbeat();
    },
    onDisconnect: () => {
      const s = getStore();
      console.warn("[VoiceOverlay] ElevenLabs disconnected. state:", s.machineState);
      const wasConnected = hasConnectedRef.current;
      hasConnectedRef.current = false;
      firstAudioReceivedRef.current = false;
      alexVoiceService.markWsConnected(false);
      if (firstAudioTimerRef.current) {
        clearTimeout(firstAudioTimerRef.current);
        firstAudioTimerRef.current = null;
      }
      if (stabilizationTimerRef.current) {
        clearTimeout(stabilizationTimerRef.current);
        stabilizationTimerRef.current = null;
      }
      const timeSinceBoot = Date.now() - bootTimeRef.current;
      if (s.isOverlayOpen && wasConnected && timeSinceBoot > 2000) {
        s.setError("connection_lost", "La voix d'Alex a été interrompue. Je réessaie automatiquement.", true);
      } else if (s.isOverlayOpen && !wasConnected) {
        s.setError("connection_failed", "Connexion vocale échouée. Je réessaie automatiquement.", true);
      }
    },
    onError: (error) => {
      console.error("[VoiceOverlay] Error:", error);
      if (firstAudioTimerRef.current) {
        clearTimeout(firstAudioTimerRef.current);
        firstAudioTimerRef.current = null;
      }
      if (stabilizationTimerRef.current) {
        clearTimeout(stabilizationTimerRef.current);
        stabilizationTimerRef.current = null;
      }
      const s = getStore();
      if (s.isOverlayOpen) {
        const rawMessage = (error as any)?.message || "Erreur de connexion vocale.";
        const msg = rawMessage.includes("moteur vocal") || rawMessage.includes("serveur vocal")
          ? rawMessage
          : rawMessage.includes("not available") || rawMessage.includes("bidiGenerateContent")
          ? "Le moteur vocal est indisponible. Alex continue par chat."
          : "La voix d'Alex tarde à démarrer. Je réessaie automatiquement.";
        alexVoiceService.setError(msg, "voice_error");
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
        s.transitionTo("speaking", "elevenlabs_speaking");
      }
    } else if (hasConnectedRef.current) {
      if (s.machineState === "speaking") {
        s.transitionTo("awaiting_user", "elevenlabs_done_speaking");
        setTimeout(() => {
          const latest = getStore();
          if (latest.machineState === "awaiting_user") {
            latest.transitionTo("listening", "awaiting_to_listening");
          }
        }, 300);
      }
    }
  }, [isSpeaking, isActive]);

  // Keep refs up to date so the boot effect doesn't depend on start/buildGreeting identity
  startRef.current = start;
  buildGreetingRef.current = buildGreeting;

  // ─── BOOT SEQUENCE when overlay opens ───
  useEffect(() => {
    if (!store.isOverlayOpen) {
      // Reset boot flag when overlay closes so next open can boot
      bootInitiatedRef.current = false;
      return;
    }

    // Only boot once per overlay open — guard via ref, not machineState dep
    const s = getStore();
    if (s.machineState !== "requesting_permission") return;
    if (bootInitiatedRef.current) return;
    bootInitiatedRef.current = true;

    // ─── Single-session lock ───
    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;
    const existing = getActiveSessionId();
    if (existing && existing !== newSessionId) {
      console.warn("[ALEX VOICE] ⚠️ Killing stale session before new boot:", existing);
      try { window.dispatchEvent(new CustomEvent("alex-voice-force-kill", { detail: { reason: "new_session" } })); } catch {}
      unlockRuntime();
    }
    if (!lockRuntime(newSessionId)) {
      console.error("[ALEX VOICE] ❌ Could not acquire runtime lock");
      bootInitiatedRef.current = false;
      return;
    }
    console.log("[ALEX VOICE] 🔒 Session locked:", newSessionId.slice(0, 8));

    // Reset auto-retry counter on a fresh open
    autoRetryCountRef.current = 0;
    setSlowToken(false);

    let bootTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Helper: bail directly to chat fallback (no dead-end red error)
    const bailToChat = (reason: string) => {
      console.log(`[ALEX VOICE] 🚪 Bail to chat (${reason})`);
      alexVoiceService.switchToFallbackChat(reason);
      openChatFallback(
        reason,
        transcriptsRef.current.map((t) => ({ role: t.role, text: t.text })),
      );
      try { stop(); } catch {}
      getStore().closeVoiceSession(reason);
    };

    // Helper: arm the first-audio timer for the current attempt
    const armFirstAudioTimer = () => {
      if (firstAudioTimerRef.current) clearTimeout(firstAudioTimerRef.current);
      firstAudioTimerRef.current = setTimeout(() => {
        const s = getStore();
        if (firstAudioReceivedRef.current || !s.isOverlayOpen) return;
        if (!["stabilizing", "opening_session", "session_ready"].includes(s.machineState)) return;

        if (autoRetryCountRef.current < MAX_AUTO_RETRIES) {
          autoRetryCountRef.current += 1;
          const attempt = alexVoiceService.incrementRetry();
          const backoff = attempt === 1 ? 500 : attempt === 2 ? 1500 : 3000;
          console.log(`[ALEX VOICE] 🔁 Silent retry ${attempt} in ${backoff}ms (no audio in ${FIRST_AUDIO_TIMEOUT_MS}ms)`);
          try { stop(); } catch {}
          setTimeout(() => {
            if (!getStore().isOverlayOpen) return;
            hasConnectedRef.current = false;
            firstAudioReceivedRef.current = false;
            startRef.current({ initialGreeting: buildGreetingRef.current(), force: true })
              .then(() => {
                bootTimeRef.current = Date.now();
                armFirstAudioTimer();
              })
              .catch((e: any) => {
                console.error("[ALEX VOICE] retry failed:", e);
                bailToChat("retry_failed");
              });
          }, backoff);
          return;
        }

        // Out of retries → bail to chat directly (no red dead-end)
        bailToChat("no_first_audio_final");
      }, FIRST_AUDIO_TIMEOUT_MS);
    };

    const boot = async () => {
      const t0 = Date.now();
      try {
        console.log("[ALEX VOICE] 🚀 Boot start");
        setBootStep("opening");
        hasConnectedRef.current = false;
        firstAudioReceivedRef.current = false;
        if (firstAudioTimerRef.current) {
          clearTimeout(firstAudioTimerRef.current);
          firstAudioTimerRef.current = null;
        }
        getStore().transitionTo("opening_session", "boot_start");

        setBootStep("stabilizing");
        getStore().transitionTo("stabilizing", "stabilization_start");

        // HARD boot timeout — bail to chat instead of red error
        bootTimeoutId = setTimeout(() => {
          const s = getStore();
          const isStuck = s.isOverlayOpen &&
            ["stabilizing", "opening_session", "requesting_permission"].includes(s.machineState);
          if (isStuck) {
            console.error("[ALEX VOICE] ⏱️ Hard boot timeout — bailing to chat");
            bailToChat("boot_timeout");
          }
        }, BOOT_TIMEOUT_MS);

        // "Connexion d'Alex…" if token is slow (>2s)
        slowTokenTimerRef.current = setTimeout(() => {
          if (!firstAudioReceivedRef.current && getStore().isOverlayOpen) {
            console.log("[ALEX VOICE] 🐢 Token slow (>2s) — showing 'Connexion d'Alex…' label");
            setSlowToken(true);
          }
        }, TOKEN_SLOW_THRESHOLD_MS);

        // Connect ElevenLabs
        setBootStep("connecting");
        const greeting = buildGreetingRef.current();
        console.log("[ALEX VOICE] Starting session, greeting:", greeting);
        await startRef.current({ initialGreeting: greeting });

        // After await: check session still owns the runtime + overlay open
        if (!getStore().isOverlayOpen) return;
        if (getActiveSessionId() !== sessionIdRef.current) {
          console.warn("[ALEX VOICE] Session no longer owns runtime — aborting boot");
          return;
        }

        if (slowTokenTimerRef.current) {
          clearTimeout(slowTokenTimerRef.current);
          slowTokenTimerRef.current = null;
        }
        console.log(`[ALEX VOICE] ⏱️ Token + connect: ${Date.now() - t0}ms`);

        setBootStep("waiting_audio");
        armFirstAudioTimer();

        // Stabilization timer — uses getState() for fresh check
        stabilizationTimerRef.current = setTimeout(() => {
          const s = getStore();
          if (firstAudioReceivedRef.current && s.machineState === "stabilizing") {
            s.transitionTo("session_ready", "stabilization_complete_after_audio");
          }
        }, STABILIZATION_MS);

      } catch (err: any) {
        if (!getStore().isOverlayOpen) return;
        console.error("[ALEX VOICE] Boot failed:", err);
        setBootStep("error");
        if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
          alexVoiceService.setMicPermission("denied");
          toast.error("Micro désactivé", { description: "Vous pouvez continuer par chat.", duration: 3000 });
          bailToChat("permission_denied");
        } else {
          // Even on boot failure: try one auto-retry, then bail to chat
          if (autoRetryCountRef.current < MAX_AUTO_RETRIES) {
            autoRetryCountRef.current += 1;
            console.log(`[ALEX VOICE] 🔁 Boot error → auto-retry ${autoRetryCountRef.current}`);
            armFirstAudioTimer();
          } else {
            bailToChat("boot_failed");
          }
        }
      }
    };

    boot();

    return () => {
      if (bootTimeoutId) clearTimeout(bootTimeoutId);
      if (slowTokenTimerRef.current) {
        clearTimeout(slowTokenTimerRef.current);
        slowTokenTimerRef.current = null;
      }
    };
  }, [store.isOverlayOpen]);

  // ─── HEARTBEAT (paused when tab hidden — battery saver) ───
  useEffect(() => {
    if (!store.isOverlayOpen) return;

    const tick = () => {
      // Battery saver: skip heartbeat work when tab not visible
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const timeSinceBoot = Date.now() - bootTimeRef.current;
      if (timeSinceBoot < 15000) return;

      const s = getStore();
      if (!isActive && hasConnectedRef.current && s.isOverlayOpen) {
        s.incrementHeartbeatFailure();
      } else {
        s.resetHeartbeat();
      }
    };

    heartbeatRef.current = setInterval(tick, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [store.isOverlayOpen, isActive]);

  // ─── CLEANUP on overlay close — full destroy for clean reopen ───
  useEffect(() => {
    if (!store.isOverlayOpen) {
      console.log("[ALEX VOICE] 🧹 Overlay closed — full destroy");
      if (stabilizationTimerRef.current) clearTimeout(stabilizationTimerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (firstAudioTimerRef.current) clearTimeout(firstAudioTimerRef.current);
      if (slowTokenTimerRef.current) clearTimeout(slowTokenTimerRef.current);
      if (isActive) {
        stop();
      }
      // Release single-session lock so next open boots clean
      if (sessionIdRef.current) {
        unlockRuntime();
        console.log("[ALEX VOICE] 🔓 Runtime unlocked");
        sessionIdRef.current = "";
      }
      hasConnectedRef.current = false;
      firstAudioReceivedRef.current = false;
      autoRetryCountRef.current = 0;
      setTranscripts([]);
      setSlowToken(false);
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

  // ─── HARD RESET RETRY — fully destroys old session ───
  const handleRetry = useCallback(async () => {
    console.log('[ALEX VOICE] 🔄 HARD RESET initiated by user');

    // Clear all local timers
    if (firstAudioTimerRef.current) { clearTimeout(firstAudioTimerRef.current); firstAudioTimerRef.current = null; }
    if (stabilizationTimerRef.current) { clearTimeout(stabilizationTimerRef.current); stabilizationTimerRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (slowTokenTimerRef.current) { clearTimeout(slowTokenTimerRef.current); slowTokenTimerRef.current = null; }

    // Reset local refs
    hasConnectedRef.current = false;
    firstAudioReceivedRef.current = false;
    bootInitiatedRef.current = false;
    autoRetryCountRef.current = 0;
    setTranscripts([]);
    setSlowToken(false);
    entryIdRef.current = 0;
    lastAlexIdRef.current = null;

    // NUCLEAR: kill every voice resource on the page + release runtime lock
    try {
      const result = await executeHardReset();
      console.log('[ALEX VOICE] 💥 Hard reset complete', result);
    } catch (e) {
      console.warn('[ALEX VOICE] hard reset error', e);
    }

    await recovery.executeRecovery(
      stop,
      start,
      buildGreeting,
      // onRecovered
      () => {
        setBootStep("waiting_audio");
        bootTimeRef.current = Date.now();
        toast.success("Alex est reconnectée", { duration: 2000 });

        firstAudioTimerRef.current = setTimeout(() => {
          const latest = getStore();
          if (!firstAudioReceivedRef.current && latest.isOverlayOpen &&
              ["stabilizing", "opening_session", "session_ready"].includes(latest.machineState)) {
            // No red dead-end → bail straight to chat
            alexVoiceService.switchToFallbackChat("retry_no_audio");
            openChatFallback("retry_no_audio", transcriptsRef.current.map(t => ({ role: t.role, text: t.text })));
            getStore().closeVoiceSession("retry_no_audio");
          }
        }, FIRST_AUDIO_TIMEOUT_MS);
      },
      // onFallbackChat
      () => {
        toast.error("Mode chat activé", { description: "La voix n'est pas disponible pour le moment.", duration: 3000 });
        alexVoiceService.switchToFallbackChat("recovery_failed");
        openChatFallback("recovery_failed", transcriptsRef.current.map(t => ({ role: t.role, text: t.text })));
        getStore().closeVoiceSession("recovery_fallback_chat");
      },
    );
  }, [buildGreeting, start, stop, recovery, openChatFallback]);

  const handleFallbackChat = useCallback(() => {
    alexVoiceService.switchToFallbackChat("user_or_auto");
    openChatFallback("voice_unavailable", transcripts.map(t => ({ role: t.role, text: t.text })));
    getStore().closeVoiceSession("fallback_to_chat");
  }, [openChatFallback, transcripts]);

  if (!store.isOverlayOpen) return null;

  const state = store.machineState;
  const isError = state === "error_recoverable" || state === "error_fatal";
  const isStabilizing = state === "stabilizing" || state === "opening_session" || state === "requesting_permission";
  const isSessionActive = ["session_ready", "listening", "capturing_voice", "processing_stt", "processing_response", "speaking", "awaiting_user"].includes(state);
  const isRecoveringNow = recovery.isRecovering;

  const statusText =
    isRecoveringNow ? recovery.phaseLabel
    : isError ? (store.errorMessage || "Erreur")
    : slowToken && isStabilizing ? "Connexion d'Alex…"
    : isStabilizing ? getBootStepLabel(bootStep)
    : state === "listening" || state === "awaiting_user" ? "Alex écoute…"
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
                <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 bg-card/60 flex items-center justify-center">
                  <UnproIcon size={28} variant="blue" />
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

          {/* Recovery / boot loader */}
          {(isStabilizing || isRecoveringNow) && (
            <div className="px-6 py-4 flex items-center gap-2">
              {isRecoveringNow ? (
                <Zap className="w-4 h-4 text-primary animate-pulse" />
              ) : (
                <Sparkles className="w-4 h-4 text-primary animate-spin" />
              )}
              <span className="text-sm text-muted-foreground">
                {isRecoveringNow ? recovery.phaseLabel : (slowToken ? "Connexion d'Alex…" : getBootStepLabel(bootStep))}
              </span>
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
            {isRecoveringNow ? (
              <div className="flex gap-3">
                <Button disabled className="rounded-full gap-2 px-6" variant="default">
                  <Zap className="w-4 h-4 animate-pulse" /> {recovery.phaseLabel || 'Réinitialisation…'}
                </Button>
                <Button onClick={handleFallbackChat} variant="outline" className="rounded-full gap-2 px-4">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            ) : isError ? (
              <>
                <Button onClick={handleRetry} className="rounded-full gap-2 px-6" variant="default">
                  <Zap className="w-4 h-4" /> Réinitialiser Alex
                </Button>
                <Button onClick={handleFallbackChat} variant="outline" className="rounded-full gap-2 px-6">
                  <MessageSquare className="w-4 h-4" /> Passer au chat
                </Button>
              </>
            ) : isStabilizing ? (
              <div className="flex gap-3">
                <Button disabled className="rounded-full gap-2 px-6" variant="default">
                  <Sparkles className="w-4 h-4 animate-spin" /> Alex démarre…
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
    case "init": return "Alex démarre…";
    case "opening": return "Alex démarre…";
    case "stabilizing": return "Alex démarre…";
    case "connecting": return "Alex démarre…";
    case "connected": return "Alex se prépare…";
    case "waiting_audio": return "Alex se prépare…";
    case "live": return "Alex vous parle";
    case "error": return "Erreur de démarrage";
    default: return "Alex démarre…";
  }
}

// ─── Boot Checklist ───
function BootChecklist({ step }: { step: string }) {
  const steps = [
    { key: "opening", label: "Démarrage" },
    { key: "stabilizing", label: "Préparation audio" },
    { key: "connecting", label: "Activation vocale" },
    { key: "connected", label: "Moteur vocal prêt" },
    { key: "waiting_audio", label: "Alex démarre sa salutation" },
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
        <UnproIcon size={48} variant="blue" className="opacity-80" />
      </motion.div>
    </div>
  );
}
