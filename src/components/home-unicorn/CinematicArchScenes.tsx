/**
 * CinematicArchScenes — Living architectural background for the UNPRO homepage.
 *
 * 5 scenes crossfade every 4s with blur + scale parallax. Designed to sit
 * fixed behind the unicorn-theme glass UI. Respects prefers-reduced-motion.
 * Pure CSS animation (no framer-motion) to keep mobile main-thread free.
 */
import { useEffect, useState } from "react";
import scene1 from "@/assets/scenes/scene-1-exterior.jpg";
import scene2 from "@/assets/scenes/scene-2-roofing.jpg";
import scene3 from "@/assets/scenes/scene-3-kitchen.jpg";
import scene4 from "@/assets/scenes/scene-4-framing.jpg";
import scene5 from "@/assets/scenes/scene-5-blueprint.jpg";
import BlueprintOverlay from "./BlueprintOverlay";

const SCENES = [scene1, scene2, scene3, scene4, scene5];
const INTERVAL_MS = 4000;

interface Props {
  /** Optional override for darkness (0..1). Default 0 (no extra dim). */
  vignette?: number;
}

export default function CinematicArchScenes({ vignette = 0 }: Props) {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SCENES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: "#EAF2FF" }}
    >
      {SCENES.map((src, i) => {
        const isActive = i === active;
        return (
          <img
            key={src}
            src={src}
            alt=""
            width={1920}
            height={1080}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "scale(1.025)" : "scale(1)",
              filter: isActive ? "blur(0px) saturate(95%)" : "blur(8px) saturate(95%)",
              transition:
                "opacity 1400ms cubic-bezier(.22,1,.36,1), transform 8000ms linear, filter 1400ms cubic-bezier(.22,1,.36,1)",
              willChange: "opacity, transform, filter",
            }}
          />
        );
      })}

      {/* Unified blue atmospheric overlay — ties every scene together */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 80% -10%, rgba(59,130,246,0.22), transparent 55%)," +
            "radial-gradient(110% 80% at -10% 30%, rgba(189,231,255,0.32), transparent 60%)," +
            "linear-gradient(180deg, rgba(247,250,255,0.55) 0%, rgba(238,244,255,0.78) 55%, rgba(238,244,255,0.92) 100%)",
        }}
      />

      {/* Subtle architectural blueprint trace layer */}
      <BlueprintOverlay />

      {/* Soft white-glow diffusion mask */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, rgba(255,255,255,0.35), transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Vignette for readability */}
      {vignette > 0 && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(11,18,32,0.18) 100%)",
            opacity: vignette,
          }}
        />
      )}
    </div>
  );
}
