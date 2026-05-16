/**
 * AlexGestureMenu — radial 4-direction menu that appears around the orb
 * during a long press. Highlights the currently-aimed direction.
 *
 * Pure presentational: parent owns the open/closed + direction state.
 */
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mic, History, Zap, ChevronDown } from "lucide-react";
import type { GestureDirection } from "@/hooks/useAlexGestures";

interface Props {
  open: boolean;
  direction: GestureDirection;
  /** Orb diameter in px — menu items are placed just outside the orb. */
  orbSize: number;
}

const ITEMS: Array<{
  dir: Exclude<GestureDirection, null>;
  label: string;
  Icon: typeof Mic;
  angle: number; // deg from top, clockwise
}> = [
  { dir: "up",    label: "Parler à Alex",   Icon: Mic,         angle: 0   },
  { dir: "right", label: "Actions rapides", Icon: Zap,         angle: 90  },
  { dir: "down",  label: "Réduire",         Icon: ChevronDown, angle: 180 },
  { dir: "left",  label: "Historique",      Icon: History,     angle: 270 },
];

export default function AlexGestureMenu({ open, direction, orbSize }: Props) {
  const reduce = useReducedMotion();
  const radius = orbSize * 0.85;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Background dim — covers the page, dims everything subtly */}
          <motion.div
            key="dim"
            className="fixed inset-0 z-[59] pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, transparent 0%, hsl(220 50% 4% / 0.55) 80%)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
            aria-hidden
          />

          {/* Radial menu — positioned at the orb center via absolute parent */}
          <motion.div
            key="menu"
            className="absolute left-1/2 top-1/2 z-[60] pointer-events-none"
            style={{ width: 0, height: 0 }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            aria-hidden
          >
            {ITEMS.map(({ dir, label, Icon, angle }, i) => {
              const rad = (angle - 90) * (Math.PI / 180); // 0deg = top
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              const active = direction === dir;
              return (
                <motion.div
                  key={dir}
                  className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: x, top: y }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    scale: active ? 1.18 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{
                    duration: reduce ? 0 : 0.22,
                    delay: reduce ? 0 : i * 0.04,
                    ease: "easeOut",
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full transition-shadow"
                    style={{
                      width: 48,
                      height: 48,
                      background: active
                        ? "linear-gradient(135deg, hsl(212 100% 60%), hsl(252 100% 65%))"
                        : "hsl(220 50% 10% / 0.85)",
                      border: `1px solid hsl(212 100% 70% / ${active ? 0.7 : 0.25})`,
                      boxShadow: active
                        ? "0 0 24px hsl(212 100% 60% / 0.65), inset 0 1px 0 hsl(0 0% 100% / 0.2)"
                        : "0 4px 16px hsl(220 60% 4% / 0.5)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    <Icon
                      className="text-white"
                      style={{ width: 20, height: 20, opacity: active ? 1 : 0.85 }}
                      strokeWidth={2.2}
                    />
                  </div>
                  <span
                    className="whitespace-nowrap text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
                    style={{
                      color: active ? "hsl(212 100% 92%)" : "hsl(0 0% 100% / 0.7)",
                      background: active
                        ? "hsl(212 100% 60% / 0.18)"
                        : "hsl(220 50% 6% / 0.7)",
                      border: `1px solid hsl(212 100% 70% / ${active ? 0.4 : 0.1})`,
                    }}
                  >
                    {label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
