/**
 * PremiumReveal — Cinematic page/section transition wrapper.
 * Animates content in with blur, clip-path, scale, and opacity.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

type PremiumRevealProps = {
  pageKey: string | number;
  children: ReactNode;
};

export function PremiumReveal({ pageKey, children }: PremiumRevealProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{
          opacity: 0,
          y: 14,
          scale: 0.985,
          filter: "blur(10px)",
          clipPath: "inset(0% 0% 18% 0% round 28px)",
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          clipPath: "inset(0% 0% 0% 0% round 0px)",
        }}
        exit={{
          opacity: 0,
          y: -8,
          scale: 0.992,
          filter: "blur(6px)",
          clipPath: "inset(0% 0% 10% 0% round 28px)",
        }}
        transition={{
          duration: 0.52,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
