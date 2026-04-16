/**
 * StickyMiniCounterBar — Fixed bar that appears after scrolling, with LIVE badge + mini counter.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import WidgetCounterMiniInline from "./WidgetCounterMiniInline";

interface Props {
  threshold?: number;
  className?: string;
}

export default function StickyMiniCounterBar({ threshold = 400, className }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/30 py-1.5 px-4",
            className
          )}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
            {/* LIVE badge */}
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              LIVE
            </span>

            <WidgetCounterMiniInline />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
