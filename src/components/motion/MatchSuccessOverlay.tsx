/**
 * MatchSuccessOverlay — Full-viewport (lite) overlay showing match success.
 * Lazy-loaded on demand.
 */
import { motion, AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUnproSound } from "@/hooks/useUnproSound";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

export default function MatchSuccessOverlay({ open, onClose, children, className }: Props) {
  const { matchSuccess } = useUnproSound();

  useEffect(() => {
    if (open) matchSuccess();
  }, [open, matchSuccess]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center p-6",
            "bg-background/80 backdrop-blur-xl",
            className,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Match trouvé"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, filter: "blur(8px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-lg w-full rounded-3xl bg-card/95 border border-primary/40 p-6 shadow-[0_20px_60px_-12px_hsl(var(--primary)/0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success halo */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-3xl"
              style={{
                background:
                  "radial-gradient(circle at center, hsl(var(--success) / 0.18), transparent 70%)",
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: [0, 1, 0.7], scale: [0.85, 1.15, 1] }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
            <div className="relative">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
