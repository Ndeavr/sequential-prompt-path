/**
 * WidgetScoreDigitsFlipReveal — Animated flip counter for score reveal.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  targetScore: number;
  revealed: boolean;
  className?: string;
}

export default function WidgetScoreDigitsFlipReveal({ targetScore, revealed, className = "" }: Props) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!revealed) { setDisplayScore(0); return; }
    let frame = 0;
    const totalFrames = 40;
    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * targetScore));
      if (frame >= totalFrames) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [revealed, targetScore]);

  const digits = String(displayScore).padStart(2, "0").split("");

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <AnimatePresence mode="popLayout">
        {digits.map((d, i) => (
          <motion.span
            key={`${i}-${d}`}
            initial={{ y: 20, opacity: 0, rotateX: -90 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: -20, opacity: 0, rotateX: 90 }}
            transition={{ duration: 0.15, delay: i * 0.05 }}
            className="inline-block text-6xl sm:text-7xl font-bold text-foreground tabular-nums"
            style={{ perspective: 200 }}
          >
            {d}
          </motion.span>
        ))}
      </AnimatePresence>
      <span className="text-2xl text-muted-foreground font-medium ml-1">/100</span>
    </div>
  );
}
