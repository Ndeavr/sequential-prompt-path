/**
 * PageTransitionVault — Wraps route content with a vault-feel transition + scan line.
 * Lightweight (no heavy filters); honours reduced motion.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

interface Props {
  pageKey: string | number;
  children: ReactNode;
}

export default function PageTransitionVault({ pageKey, children }: Props) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(8px)" }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(6px)" }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {!reduce && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.5, ease: "linear" }}
            style={{ transformOrigin: "left" }}
          />
        )}
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
