/**
 * AlexTradesAura — Faded rotating trade images behind the Alex orb.
 * Variants:
 *  - "orb" (default, legacy): masked aura tightly around the orb.
 *  - "section": fills the whole hero section as a fullscreen background.
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

type Variant = "orb" | "section";

interface Props {
  variant?: Variant;
}

export default function AlexTradesAura({ variant = "orb" }: Props) {
  const startOffset = useMemo(
    () => Math.floor(Math.random() * TRADES.length),
    [],
  );
  const [index, setIndex] = useState(startOffset);

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

  if (variant === "section") {
    // Fullscreen background — image visible edge to edge, orb sits on top.
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {TRADES.map((trade, i) => (
          <motion.img
            key={trade.src}
            src={trade.src}
            alt=""
            decoding="async"
            loading="eager"
            initial={false}
            animate={{ opacity: i === index ? 0.85 : 0 }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover saturate-110 contrast-110"
          />
        ))}

        {/* Top readability — protects title + subtext */}
        <div
          className="absolute inset-x-0 top-0 h-[42%]"
          style={{
            background:
              "linear-gradient(to bottom, hsl(220 50% 4% / 0.92) 0%, hsl(220 50% 4% / 0.75) 45%, transparent 100%)",
          }}
        />

        {/* Center depth — softens behind the orb */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 45% at 50% 55%, hsl(220 50% 4% / 0.55) 0%, transparent 70%)",
          }}
        />

        {/* Bottom readability — protects badge + CTA + nav */}
        <div
          className="absolute inset-x-0 bottom-0 h-[35%]"
          style={{
            background:
              "linear-gradient(to top, hsl(220 50% 4% / 0.95) 0%, hsl(220 50% 4% / 0.7) 50%, transparent 100%)",
          }}
        />

        {/* Edge vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,hsl(220_50%_4%/0.7)_100%)]" />
      </div>
    );
  }

  // Legacy "orb" variant
  const MASK = "radial-gradient(ellipse 95% 80% at 50% 60%, black 65%, transparent 100%)";
  const IMG_CLASS =
    "w-full h-full max-w-none object-cover rounded-[2.5rem] blur-[0.5px] saturate-125 contrast-110 will-change-[opacity]";
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
            decoding="async"
            loading="eager"
            initial={false}
            animate={{ opacity: i === index ? 0.72 : 0 }}
            transition={{ duration: 2.6, ease: "easeInOut" }}
            className={`absolute inset-0 ${IMG_CLASS}`}
            style={{ maskImage: MASK, WebkitMaskImage: MASK }}
          />
        ))}
      </div>
      <div
        className="pointer-events-none absolute -inset-32 sm:-inset-40 md:-inset-48 bg-gradient-to-b from-background/95 via-background/50 to-transparent"
        style={{ height: "35%" }}
      />
      <div className="pointer-events-none absolute -inset-32 sm:-inset-40 md:-inset-48 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,transparent_65%,hsl(var(--background)/0.55)_100%)]" />
    </div>
  );
}
