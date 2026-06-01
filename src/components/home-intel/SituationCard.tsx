/**
 * SituationCard — One glassmorphism card for a homeowner situation.
 */
import { motion } from "framer-motion";
import type { HomeownerSituation } from "@/config/homeownerSituations";

interface Props {
  situation: HomeownerSituation;
  onActivate: (s: HomeownerSituation) => void;
}

export default function SituationCard({ situation, onActivate }: Props) {
  const Icon = situation.icon;
  return (
    <motion.button
      type="button"
      onClick={() => onActivate(situation)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="group relative text-left snap-start shrink-0 w-[78%] sm:w-[46%] lg:w-full
        rounded-[28px] p-5 lg:p-6 overflow-hidden
        bg-white/[0.04] backdrop-blur-2xl border border-white/[0.06]
        hover:border-white/[0.12] hover:bg-white/[0.06]
        shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
    >
      {/* Accent glow */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-70
          bg-gradient-to-br ${situation.accent} pointer-events-none
          group-hover:opacity-100 transition-opacity duration-500`}
      />

      <div className="relative flex flex-col gap-4 min-h-[148px]">
        <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.08]
          flex items-center justify-center backdrop-blur-xl">
          <Icon className="w-5 h-5 text-white/90" strokeWidth={1.6} />
        </div>

        <div className="flex-1">
          <h3 className="text-white font-semibold text-[15px] leading-tight tracking-[-0.01em] mb-1.5">
            {situation.title}
          </h3>
          <p className="text-white/55 text-[13px] leading-snug">
            {situation.subtitle}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
