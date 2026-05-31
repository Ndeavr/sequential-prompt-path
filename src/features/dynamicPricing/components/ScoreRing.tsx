import { motion } from "framer-motion";

interface Props {
  label: string;
  value: number; // 0-100
  hint?: string;
  accent?: "blue" | "amber" | "rose" | "emerald";
}

const ACCENTS = {
  blue: "stroke-[hsl(210,100%,65%)]",
  amber: "stroke-[hsl(40,100%,60%)]",
  rose: "stroke-[hsl(350,90%,65%)]",
  emerald: "stroke-[hsl(160,80%,55%)]",
} as const;

export function ScoreRing({ label, value, hint, accent = "blue" }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const r = 38;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-[20px] bg-white/[0.03] border border-white/5 backdrop-blur-sm">
      <div className="relative w-[96px] h-[96px]">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} className="fill-none stroke-white/10" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            className={`fill-none ${ACCENTS[accent]}`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - dash }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-white tracking-tight">
          {v}
        </div>
      </div>
      <div className="text-xs uppercase tracking-widest text-white/60">{label}</div>
      {hint && <div className="text-[10px] text-white/40">{hint}</div>}
    </div>
  );
}
