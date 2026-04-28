/**
 * HeroAlexCentered — Title + subtext + premium animated Alex orb (centered).
 * Tap orb → opens locked full-screen voice overlay (true Alex voice session).
 */
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useAlexVoice as useAlexVoiceOverlay } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";

export default function HeroAlexCentered() {
  const { openAlex } = useAlexVoiceOverlay();
  const mode = useAlexStore((s) => s.mode);

  const handleOrb = () => {
    useAlexStore.getState().markUserEngaged();
    openAlex("home_hero", "user_tapped_orb");
  };

  const isLive = mode === "speaking" || mode === "listening" || mode === "thinking";

  return (
    <section className="relative px-5 pt-10 pb-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-[clamp(1.9rem,6vw,3rem)] font-display font-bold leading-[1.05] tracking-tight text-foreground"
      >
        Décrivez votre problème<br />ou imaginez votre projet
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.4 }}
        className="mt-4 text-base md:text-lg text-muted-foreground max-w-md mx-auto"
      >
        Alex vous aide à estimer, comprendre, comparer et trouver le bon pro.
      </motion.p>

      {/* Premium orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 120, damping: 18 }}
        className="relative mt-12 mx-auto flex flex-col items-center"
        style={{ width: 260, height: 260 }}
      >
        <PremiumAlexOrb onTap={handleOrb} live={isLive} />

        <div className="mt-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-border/40">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-foreground">Alex</span>
          <span className="text-sm text-muted-foreground">· Votre expert IA</span>
        </div>

        <button
          onClick={handleOrb}
          className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Mic className="w-4 h-4" />
          Cliquez pour parler à Alex
        </button>
      </motion.div>
    </section>
  );
}

/**
 * PremiumAlexOrb — beautiful, modern, reactive orb.
 * Pure CSS/SVG/Framer — no external deps.
 */
function PremiumAlexOrb({ onTap, live }: { onTap: () => void; live: boolean }) {
  return (
    <button
      onClick={onTap}
      aria-label="Parler à Alex"
      className="relative flex items-center justify-center w-[220px] h-[220px] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 group"
    >
      {/* Outer ambient halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.35) 0%, hsl(var(--primary) / 0.12) 35%, transparent 70%)",
          filter: "blur(28px)",
        }}
        animate={{ scale: live ? [1, 1.15, 1] : [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: live ? 1.6 : 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating conic ring */}
      <motion.div
        className="absolute inset-3 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(var(--primary)) 0deg, hsl(var(--accent, var(--primary))) 120deg, transparent 200deg, hsl(var(--primary)) 360deg)",
          mask: "radial-gradient(circle, transparent 62%, black 64%, black 70%, transparent 72%)",
          WebkitMask: "radial-gradient(circle, transparent 62%, black 64%, black 70%, transparent 72%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: live ? 6 : 14, repeat: Infinity, ease: "linear" }}
      />

      {/* Counter-rotating thin ring */}
      <motion.div
        className="absolute inset-6 rounded-full border border-primary/30"
        animate={{ rotate: -360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        style={{
          boxShadow: "inset 0 0 30px hsl(var(--primary) / 0.25)",
        }}
      />

      {/* Glass core */}
      <motion.div
        className="relative w-[150px] h-[150px] rounded-full overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(var(--primary) / 0.55), hsl(var(--primary) / 0.15) 55%, hsl(220 60% 8% / 0.95) 100%)",
          boxShadow:
            "0 20px 60px -10px hsl(var(--primary) / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.18), inset 0 -20px 40px hsl(220 80% 5% / 0.6)",
          backdropFilter: "blur(8px)",
        }}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        {/* Liquid blob 1 */}
        <motion.div
          className="absolute w-[70%] h-[70%] rounded-full"
          style={{
            top: "10%",
            left: "5%",
            background: "radial-gradient(circle, hsl(var(--primary) / 0.7), transparent 70%)",
            filter: "blur(14px)",
          }}
          animate={{
            x: [0, 18, -10, 0],
            y: [0, -14, 12, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Liquid blob 2 */}
        <motion.div
          className="absolute w-[55%] h-[55%] rounded-full"
          style={{
            bottom: "10%",
            right: "5%",
            background: "radial-gradient(circle, hsl(200 100% 70% / 0.6), transparent 70%)",
            filter: "blur(16px)",
          }}
          animate={{
            x: [0, -14, 18, 0],
            y: [0, 12, -10, 0],
            scale: [1, 0.9, 1.2, 1],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Specular highlight */}
        <div
          className="absolute top-3 left-6 w-16 h-10 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(0 0% 100% / 0.55), transparent 70%)",
            filter: "blur(6px)",
          }}
        />

        {/* Center monogram */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[44px] font-display font-bold text-white"
            style={{ textShadow: "0 2px 14px hsl(var(--primary) / 0.8)" }}
          >
            A
          </span>
        </div>
      </motion.div>

      {/* Reactive speaking waves */}
      {live &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border border-primary/40 pointer-events-none"
            animate={{ scale: [1, 1.35 + i * 0.12], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
          />
        ))}
    </button>
  );
}
