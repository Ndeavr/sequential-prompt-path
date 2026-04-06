/**
 * TerminalViewportGreenStream — Premium green-on-black terminal viewport
 * with auto-scroll, typing effect, and scan glow.
 */
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TerminalLine } from "@/hooks/useTerminalImportAnimation";
import { Terminal } from "lucide-react";

interface Props {
  lines: TerminalLine[];
  isRunning: boolean;
  maxVisibleLines?: number;
}

const severityColor: Record<string, string> = {
  info: "text-emerald-400/80",
  success: "text-emerald-300",
  warning: "text-amber-400",
  error: "text-red-400",
};

const typePrefix: Record<string, string> = {
  boot: "SYS",
  lookup: "FIND",
  fetch: "GET",
  parse: "DATA",
  normalize: "NORM",
  verify: "VRFY",
  analyze: "ANLZ",
  score: "SCOR",
  predict: "PRED",
  recommend: "RCMD",
  success: "OK",
  warning: "WARN",
  error: "ERR",
};

export default function TerminalViewportGreenStream({ lines, isRunning, maxVisibleLines = 12 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleLines = lines.slice(-maxVisibleLines);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-emerald-500/10">
      {/* Scan line effect */}
      {isRunning && (
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent z-10 pointer-events-none"
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Terminal background */}
      <div
        className="p-1 sm:p-1.5"
        style={{
          background: "linear-gradient(180deg, hsl(160 20% 3%) 0%, hsl(160 30% 2%) 100%)",
        }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] font-mono text-emerald-500/50 flex-1 text-center tracking-wider uppercase">
            UNPRO Import Terminal
          </span>
          {isRunning && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        {/* Lines */}
        <div
          ref={scrollRef}
          className="font-mono text-[11px] sm:text-xs leading-relaxed px-3 py-2 space-y-0.5 overflow-y-auto scroll-smooth"
          style={{ maxHeight: maxVisibleLines * 22, scrollBehavior: "smooth" }}
        >
          <AnimatePresence mode="popLayout">
            {visibleLines.map((line) => {
              const displayText = line.typedChars < line.totalChars
                ? line.text.slice(0, line.typedChars)
                : line.text;
              const isTyping = line.typedChars < line.totalChars;
              const prefix = typePrefix[line.type] || "LOG";

              return (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0.3 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2 items-start py-px"
                >
                  <span className="text-emerald-700/50 shrink-0 w-12 text-right tabular-nums">
                    [{line.timestamp.toFixed(1)}s]
                  </span>
                  <span className="text-emerald-600/60 shrink-0 w-10 text-right font-semibold text-[9px]">
                    {prefix}
                  </span>
                  <span className={`${severityColor[line.severity]} ${line.severity === "success" ? "font-semibold" : ""}`}>
                    {displayText}
                    {isTyping && (
                      <motion.span
                        className="inline-block w-1.5 h-3 bg-emerald-400 ml-0.5 align-middle"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    )}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Cursor */}
          {isRunning && (
            <div className="flex items-center gap-1 py-0.5 text-emerald-500/30">
              <Terminal className="w-3 h-3" />
              <motion.span
                className="inline-block w-2 h-3.5 bg-emerald-400/70"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
