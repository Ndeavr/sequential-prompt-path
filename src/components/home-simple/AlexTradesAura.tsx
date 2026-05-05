/**
 * AlexTradesAura — Faded rotating trade images behind the Alex orb.
 * Smooth crossfade with no flicker (preloaded + permanent layers).
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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

// Reveal only the bottom-center where the action lives; hide top (title zone) entirely.
const MASK = "radial-gradient(ellipse 70% 55% at 50% 75%, black 50%, transparent 88%)";
const IMG_CLASS =
  "w-full h-full max-w-none object-cover rounded-[2.5rem] blur-[0.5px] saturate-125 contrast-110 will-change-[opacity]";

export default function AlexTradesAura() {
  const startOffset = useMemo(
    () => Math.floor(Math.random() * TRADES.length),
    [],
  );
  const [index, setIndex] = useState(startOffset);

  // Preload all trade images so swaps never flash a blank frame.
  useEffect(() => {
    TRADES.forEach((t) => {
      const img = new Image();
      img.src = t.src;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % TRADES.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  // Every trade is a permanently mounted layer; only opacity animates.
  // No mount/unmount → no flicker.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
    >
      <div className="absolute -inset-32 sm:-inset-40 md:-inset-48 flex items-center justify-center">
        {TRADES.map((trade, i) => (
          <motion.img
            key={trade.src}
            src={trade.src}
            alt=""
            width={1024}
            height={1024}
            decoding="async"
            loading="eager"
            initial={false}
            animate={{ opacity: i === index ? 0.6 : 0 }}
            transition={{ duration: 2.6, ease: "easeInOut" }}
            className={`absolute inset-0 ${IMG_CLASS}`}
            style={{
              maskImage: MASK,
              WebkitMaskImage: MASK,
            }}
          />
        ))}
      </div>

      {/* Top-down dark gradient — locks title legibility */}
      <div className="pointer-events-none absolute -inset-32 sm:-inset-40 md:-inset-48 bg-gradient-to-b from-background via-background/70 to-transparent" style={{ height: "55%" }} />

      {/* Soft transparent vignette — darkens edges without hiding the image */}
              maskImage: MASK,
              WebkitMaskImage: MASK,
            }}
          />
        ))}
      </div>

      {/* Soft transparent vignette — darkens edges without hiding the image */}
      <div className="pointer-events-none absolute -inset-32 sm:-inset-40 md:-inset-48 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,transparent_50%,hsl(var(--background)/0.7)_92%)]" />
    </div>
  );
}
