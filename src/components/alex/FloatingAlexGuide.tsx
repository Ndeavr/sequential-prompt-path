/**
 * FloatingAlexGuide — Persistent mini Alex orb + live transcription bubble.
 *
 * Visible globally on contractor funnel pages. Hidden on /admin, /auth, /role,
 * and when stage is "idle". Tap → opens voice overlay (event-driven, respects
 * the mic-on-tap rule).
 *
 * Text-only narration by default. No auto TTS. Driven by `alexCheckoutState`.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAlexCheckoutState } from "@/stores/alexCheckoutState";
import { useAlexCheckoutNarration } from "@/hooks/useAlexCheckoutNarration";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = ["/admin", "/auth", "/role", "/login", "/signup"];

export default function FloatingAlexGuide() {
  const location = useLocation();
  const stage = useAlexCheckoutState((s) => s.stage);
  const visible = useAlexCheckoutState((s) => s.visible);
  const { message } = useAlexCheckoutNarration();
  const { openAlex } = useAlexVoice();

  const hiddenByRoute = HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p));
  if (hiddenByRoute || !visible || stage === "idle") return null;

  const speaking = stage === "analyzing" || stage === "scoring" || stage === "recommending" || stage === "checkout" || stage === "payment_processing";
  const success = stage === "activation_success";

  return (
    <div
      className="fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[260px] rounded-2xl bg-white/95 backdrop-blur-xl border border-border/40 px-3.5 py-2 shadow-lg pointer-events-auto"
          >
            <p className="text-[11px] font-semibold text-primary mb-0.5">Alex</p>
            <p className="text-[12.5px] leading-snug text-foreground">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => openAlex("contractor_funnel", `stage:${stage}`)}
        className="relative h-12 w-12 pointer-events-auto"
        aria-label="Parler à Alex"
      >
        {/* Halo */}
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(222 100% 61% / 0.30) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orb */}
        <motion.span
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-full overflow-hidden",
            "shadow-[0_8px_24px_-4px_hsl(222_100%_61%/0.45)]"
          )}
          style={{
            background: success
              ? "linear-gradient(135deg, hsl(150 70% 45%), hsl(180 70% 50%))"
              : "linear-gradient(135deg, hsl(222 100% 55%), hsl(252 100% 60%), hsl(195 100% 48%))",
          }}
          animate={speaking ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 1.4, repeat: speaking ? Infinity : 0, ease: "easeInOut" }}
          whileTap={{ scale: 0.94 }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 28%, hsl(0 0% 100% / 0.28), transparent 55%)",
            }}
          />
          <Sparkles className="relative z-10 h-5 w-5 text-white" />
        </motion.span>
      </button>
    </div>
  );
}
