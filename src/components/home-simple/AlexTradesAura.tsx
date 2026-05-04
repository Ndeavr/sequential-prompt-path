/**
 * AlexTradesAura — Faded rotating trade images behind the Alex orb.
 * Cycles through random renovation/trade visuals with smooth fade transitions.
 * Pure decorative layer — pointer-events disabled, sits behind the orb.
 */
import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import renovation from "@/assets/trades/renovation.jpg";
import ceramic from "@/assets/trades/ceramic.jpg";
import painting from "@/assets/trades/painting.jpg";
import excavation from "@/assets/trades/excavation.jpg";
import notary from "@/assets/trades/notary.jpg";
import plumbing from "@/assets/trades/plumbing.jpg";
import electrical from "@/assets/trades/electrical.jpg";
import carpentry from "@/assets/trades/carpentry.jpg";

const TRADES = [
  { src: renovation, label: "Rénovation" },
  { src: ceramic, label: "Céramique" },
  { src: painting, label: "Peinture" },
  { src: excavation, label: "Excavation" },
  { src: notary, label: "Notaire" },
  { src: plumbing, label: "Plomberie" },
  { src: electrical, label: "Électricité" },
  { src: carpentry, label: "Menuiserie" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function AlexTradesAura() {
  // Start at a random offset so different visits don't always show the same first trade.
  const startOffset = useMemo(() => Math.floor(Math.random() * TRADES.length), []);
  const [index, setIndex] = useState(startOffset);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % TRADES.length);
    }, 6500); // slower rotation — let each trade breathe
    return () => clearInterval(id);
  }, []);

  const current = TRADES[index];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 0.78, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 2.4, ease: "easeInOut" }}
          className="absolute -inset-32 sm:-inset-40 md:-inset-48 flex items-center justify-center"
        >
          <img
            src={current.src}
            alt=""
            loading="lazy"
            width={1024}
            height={1024}
            className="w-full h-full max-w-none object-cover rounded-[2.5rem] blur-[0.5px] saturate-125 contrast-110"
            style={{
              maskImage:
                "radial-gradient(ellipse at center, black 55%, transparent 90%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 55%, transparent 90%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Soft transparent vignette — darkens edges without hiding the image */}
      <div className="pointer-events-none absolute -inset-32 sm:-inset-40 md:-inset-48 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,transparent_50%,hsl(var(--background)/0.7)_92%)]" />
    </div>
  );
}
