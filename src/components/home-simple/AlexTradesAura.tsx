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
  const sequence = useMemo(() => shuffle(TRADES), []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % sequence.length);
    }, 3800);
    return () => clearInterval(id);
  }, [sequence.length]);

  const current = sequence[index];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 0.55, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <img
            src={current.src}
            alt=""
            loading="lazy"
            width={640}
            height={640}
            className="w-full h-full object-cover rounded-full blur-[1px]"
            style={{
              maskImage:
                "radial-gradient(circle at center, black 45%, transparent 85%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, black 45%, transparent 85%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Soft transparent vignette — darkens edges without hiding the image */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_40%,rgba(6,11,20,0.75)_85%)]" />
    </div>
  );
}
