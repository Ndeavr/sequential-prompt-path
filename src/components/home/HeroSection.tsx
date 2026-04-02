/**
 * HeroSection — Cinematic AI Home with Gemini Live Native Audio voice.
 * Uses useLiveVoice for real-time bidirectional voice (no legacy TTS pipeline).
 */
import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { useNavigate } from "react-router-dom";
import { Mic, Volume2, Loader2, Keyboard, Square, VolumeX } from "lucide-react";
import HeroIntentSwitcher from "@/components/home/HeroIntentSwitcher";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";
import cinematicBg from "@/assets/cinematic-home-bg.jpg";


export default function HeroSection() {
  const { user } = useAuth();
  const [textSheetOpen, setTextSheetOpen] = useState(false);

  // Gemini Live voice state
  const { start, stop, isActive, isConnecting, isSpeaking } = useLiveVoice({
    onTranscript: () => {},
    onUserTranscript: () => {},
    onConnect: () => {
      console.log("[Hero] Gemini Live connected");
    },
    onDisconnect: () => {
      console.log("[Hero] Gemini Live disconnected");
    },
    onError: (err) => {
      console.error("[Hero] Gemini Live error:", err);
    },
  });

  const orbState = isConnecting
    ? "thinking"
    : isActive
    ? isSpeaking
      ? "speaking"
      : "listening"
    : "idle";

  const voiceActive = isActive || isConnecting;

  const startVoice = useCallback(() => {
    // Kill any other voice source first
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));

    // Build personalised greeting
    const firstName = user?.user_metadata?.full_name?.split(" ")[0]
      || user?.user_metadata?.first_name
      || null;

    const initialGreeting = firstName
      ? `Salue-moi. Mon prénom est ${firstName}. Dis "Bonjour ${firstName}, bienvenue."`
      : `Salue-moi. Je suis un nouveau visiteur. Dis "Bonjour, bienvenue."`;

    start({ initialGreeting });
  }, [start, user]);

  const stopVoice = useCallback(() => {
    stop();
  }, [stop]);

  const muteSpeech = useCallback(() => {
    stop();
  }, [stop]);

  const statusText =
    orbState === "speaking"
      ? "Alex vous parle…"
      : orbState === "thinking"
      ? "Connexion Gemini Live…"
      : orbState === "listening"
      ? "Je vous écoute…"
      : "Parlez à Alex";

  return (
    <>
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden">
        {/* ── Cinematic Background Image ── */}
        <motion.div
          className="absolute inset-0 z-0"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <img
            src={cinematicBg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            width={1920}
            height={1080}
          />
        </motion.div>

        {/* ── Cinematic Overlay ── */}
        <div className="absolute inset-0 z-[1]" style={{
          background: "linear-gradient(to bottom, rgba(6,11,24,0.35) 0%, rgba(6,11,24,0.6) 50%, rgba(6,11,24,0.92) 100%)",
        }} />

        {/* ── Ambient Light FX ── */}
        <div className="absolute inset-0 z-[2] pointer-events-none">
          <div className="absolute top-[45%] left-0 right-0 h-[2px]" style={{
            background: "linear-gradient(90deg, transparent 5%, hsl(222 100% 70% / 0.3) 30%, hsl(195 100% 60% / 0.4) 50%, hsl(222 100% 70% / 0.3) 70%, transparent 95%)",
            filter: "blur(1px)",
          }} />
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px]" style={{
            background: "radial-gradient(ellipse, hsl(222 100% 65% / 0.12) 0%, transparent 70%)",
          }} />
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto w-full px-5 py-16">
          {/* Intent Switcher Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full"
          >
            <HeroIntentSwitcher defaultIntent="photo" displayMode="headline-switch" />
          </motion.div>

          {/* ── Voice Orb ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.55, type: "spring", stiffness: 200 }}
            className="mt-10 mb-6 flex flex-col items-center"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer glow ring */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 140, height: 140,
                  border: "2px solid hsl(222 100% 61% / 0.25)",
                  boxShadow: "0 0 50px hsl(222 100% 61% / 0.15), inset 0 0 50px hsl(222 100% 61% / 0.05)",
                }}
                animate={{ scale: voiceActive ? [1, 1.15, 1] : [1, 1.05, 1] }}
                transition={{ duration: voiceActive ? 1.5 : 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Listening pulses */}
              {orbState === "listening" && [0, 1].map((i) => (
                <motion.div key={i} className="absolute rounded-full pointer-events-none"
                  style={{ width: 120, height: 120, border: "1.5px solid hsl(222 100% 70% / 0.2)" }}
                  animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                />
              ))}

              {/* Speaking waves */}
              {orbState === "speaking" && [0, 1].map((i) => (
                <motion.div key={`s${i}`} className="absolute rounded-full pointer-events-none"
                  style={{ width: 120, height: 120, border: "1.5px solid hsl(195 100% 60% / 0.25)" }}
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                />
              ))}

              {/* Thinking ring */}
              {orbState === "thinking" && (
                <motion.div className="absolute rounded-full pointer-events-none"
                  style={{ width: 130, height: 130, border: "2px dashed hsl(252 100% 70% / 0.2)" }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Main orb button */}
              <motion.button
                onClick={() => voiceActive ? stopVoice() : startVoice()}
                className="relative rounded-full flex items-center justify-center overflow-hidden z-10"
                style={{
                  width: 100, height: 100,
                  background: "linear-gradient(135deg, hsl(222 100% 30% / 0.85), hsl(222 100% 18% / 0.95))",
                  border: "2px solid hsl(222 100% 70% / 0.35)",
                  boxShadow: "0 0 60px -10px hsl(222 100% 65% / 0.45), inset 0 1px 1px hsl(0 0% 100% / 0.1)",
                }}
                animate={
                  orbState === "speaking" ? { scale: [1, 1.08, 1] }
                    : orbState === "listening" ? { scale: [1, 1.05, 1] }
                      : { scale: [1, 1.02, 1] }
                }
                transition={{
                  duration: orbState === "speaking" ? 0.6 : orbState === "listening" ? 1.2 : 3,
                  repeat: Infinity, ease: "easeInOut",
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 rounded-full" style={{
                  background: "radial-gradient(circle at 40% 35%, hsl(222 100% 70% / 0.3), transparent 60%)",
                }} />
                {orbState === "speaking" ? (
                  <Volume2 className="h-9 w-9 text-white/90 relative z-10" />
                ) : orbState === "thinking" ? (
                  <Loader2 className="h-9 w-9 text-white/90 relative z-10 animate-spin" />
                ) : (
                  <Mic className="h-9 w-9 text-white/90 relative z-10" />
                )}
              </motion.button>
            </div>

            {/* Status text */}
            <AnimatePresence mode="wait">
              <motion.p
                key={voiceActive ? orbState : "idle"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 text-xs font-medium text-white/50"
              >
                {statusText}
              </motion.p>
            </AnimatePresence>

            {/* Voice controls */}
            <AnimatePresence>
              {voiceActive && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-3 flex items-center gap-2"
                >
                  {orbState === "speaking" && (
                    <button onClick={muteSpeech}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <VolumeX className="h-3 w-3" /> Couper
                    </button>
                  )}
                  <button onClick={() => { stopVoice(); setTextSheetOpen(true); }}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <Keyboard className="h-3 w-3" /> Écrire
                  </button>
                  <button onClick={stopVoice}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-red-400/80 bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors"
                  >
                    <Square className="h-2.5 w-2.5" /> Arrêter
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Quick actions now handled by HeroIntentSwitcher above */}
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 z-20" style={{
          background: "linear-gradient(to top, hsl(228 40% 7%) 0%, transparent 100%)",
        }} />
      </section>

      <AlexAssistantSheet
        open={textSheetOpen}
        onClose={() => setTextSheetOpen(false)}
      />
    </>
  );
}
