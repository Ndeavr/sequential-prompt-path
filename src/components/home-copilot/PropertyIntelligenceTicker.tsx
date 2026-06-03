/**
 * PropertyIntelligenceTicker — premium glass ticker placed just under the hero.
 * Communicates the "AI understands homes" positioning with rotating insights.
 * Respects prefers-reduced-motion.
 */
import { Sparkles } from "lucide-react";
import { usePropertyIntelligenceFeed } from "@/hooks/usePropertyIntelligenceFeed";

export default function PropertyIntelligenceTicker() {
  const insights = usePropertyIntelligenceFeed(6);
  if (!insights.length) return null;

  // Duplicate for seamless marquee loop
  const loop = [...insights, ...insights];

  return (
    <section
      aria-label="Intelligence propriété en temps réel"
      className="relative bg-[hsl(220_50%_4%)] border-y border-white/5"
    >
      <div className="relative max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0 text-[11px] uppercase tracking-wider text-sky-400/80 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Intelligence
        </div>

        <div
          className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]"
          aria-live="polite"
        >
          <div
            className="flex gap-8 whitespace-nowrap animate-[ticker_45s_linear_infinite] motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:whitespace-normal"
          >
            {loop.map((i, idx) => (
              <span
                key={`${i.id}-${idx}`}
                className="text-[12.5px] text-white/75 inline-flex items-center gap-2"
              >
                <span className="w-1 h-1 rounded-full bg-sky-400/70" />
                {i.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
