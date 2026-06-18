/**
 * FounderNoteConsent — Note manuscrite du fondateur + consentement philosophie.
 *
 * - Affiche un message émotionnel universel (homeowner + contractor).
 * - L'utilisateur doit choisir avant de débloquer la suite de la homepage.
 * - Accepter → localStorage flag + event global `unpro:philosophy-accepted`.
 * - Refuser  → redirection immédiate vers google.com.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const STORAGE_KEY = "unpro_philosophy_accepted";
const PLAYED_KEY = "unpro_founder_note_played";

const LINES = [
  "Nous n'avons qu'une seule vie à vivre.",
  "Nous croyons que les propriétaires méritent de meilleurs conseils.",
  "Nous croyons que les bons entrepreneurs méritent d'être reconnus.",
  "C'est pourquoi nous avons créé UNPRO.",
];

export default function FounderNoteConsent() {
  const reduce = useReducedMotion();
  const [accepted, setAccepted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef<number | null>(null);

  // Animation: play once per session
  const shouldAnimate = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (reduce) return false;
    return window.sessionStorage.getItem(PLAYED_KEY) !== "true";
  }, [reduce]);

  useEffect(() => {
    if (shouldAnimate) {
      const t = window.setTimeout(() => {
        window.sessionStorage.setItem(PLAYED_KEY, "true");
      }, 2200);
      return () => window.clearTimeout(t);
    }
  }, [shouldAnimate]);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setAccepted(true);
    window.dispatchEvent(new Event("unpro:philosophy-accepted"));
  };

  const handleDecline = () => {
    window.location.replace("https://www.google.com");
  };

  // Soft hint when user tries to scroll past without choosing
  useEffect(() => {
    if (accepted) return;
    const onScroll = () => {
      setShowHint(true);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
      hintTimer.current = window.setTimeout(() => setShowHint(false), 4000);
    };
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, [accepted]);

  const lineDelay = (i: number) => (shouldAnimate ? 0.15 + i * 0.45 : 0);

  return (
    <section
      aria-label="Note du fondateur"
      className="relative z-10 w-full px-5 py-16 md:py-24 flex flex-col items-center"
    >
      <div
        className="w-[90%] md:max-w-[900px] mx-auto"
        style={{ transform: "rotate(-0.6deg)" }}
      >
        <div
          className="text-center"
          style={{
            fontFamily: "'Caveat', 'Segoe Script', cursive",
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.45,
            textShadow: "0 1px 12px rgba(0,0,0,0.45)",
          }}
        >
          {LINES.map((line, i) => (
            <motion.p
              key={i}
              initial={shouldAnimate ? { opacity: 0, y: 8, filter: "blur(4px)" } : false}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5, delay: lineDelay(i), ease: "easeOut" }}
              className="my-3 md:my-4 text-[22px] md:text-[36px]"
            >
              {line}
            </motion.p>
          ))}

          <motion.p
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 0.6, delay: lineDelay(LINES.length) }}
            className="mt-6 md:mt-8 text-[16px] md:text-[24px]"
          >
            — L'équipe UNPRO
          </motion.p>
        </div>
      </div>

      {!accepted && (
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: lineDelay(LINES.length) + 0.4 }}
          className="mt-10 md:mt-14 w-full max-w-2xl flex flex-col md:flex-row items-stretch gap-3 md:gap-4"
        >
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 min-h-[64px] rounded-2xl px-6 py-4 text-base md:text-lg font-medium text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-sm transition-colors"
          >
            Je suis d'accord avec cette philosophie
          </button>
          <button
            type="button"
            onClick={handleDecline}
            className="flex-1 min-h-[64px] rounded-2xl px-6 py-4 text-base md:text-lg font-medium text-white/75 bg-transparent hover:bg-white/5 border border-white/15 transition-colors"
          >
            Je n'adhère pas à cette philosophie
          </button>
        </motion.div>
      )}

      {!accepted && showHint && (
        <p className="mt-6 text-sm text-white/55 text-center">
          Veuillez choisir une option pour continuer.
        </p>
      )}
    </section>
  );
}
