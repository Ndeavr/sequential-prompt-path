/**
 * AlexOrbPremium — Liquid glass futuristic orb with breathing, halo & orbiting particles.
 * Pure CSS animations (no framer-motion) to keep bundle lean and 60fps on mobile.
 */
import { useMemo } from "react";

interface Props {
  size?: number;
  className?: string;
}

export default function AlexOrbPremium({ size = 200, className = "" }: Props) {
  const particles = useMemo(
    () => [
      { r: size * 0.55, d: 9, delay: 0, dot: 6 },
      { r: size * 0.62, d: 12, delay: 1.2, dot: 4 },
      { r: size * 0.48, d: 7, delay: 2.4, dot: 5 },
      { r: size * 0.7, d: 15, delay: 0.6, dot: 3 },
      { r: size * 0.58, d: 10, delay: 3.1, dot: 5 },
      { r: size * 0.66, d: 13, delay: 1.8, dot: 4 },
    ],
    [size]
  );

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer atmospheric aura */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.38) 0%, rgba(189,231,255,0.18) 35%, transparent 70%)",
          filter: "blur(20px)",
          transform: "scale(1.35)",
        }}
      />
      {/* Animated glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(37,99,255,0) 0%, rgba(59,130,246,.5) 25%, rgba(189,231,255,.4) 50%, rgba(99,102,241,.5) 75%, rgba(37,99,255,0) 100%)",
          filter: "blur(10px)",
          opacity: 0.55,
          animation: "spin 14s linear infinite",
        }}
      />

      {/* Orb core */}
      <div
        className="absolute inset-[8%] rounded-full overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #BDE7FF 12%, #3B82F6 45%, #1E40AF 85%, #0B1E5C 100%)",
          boxShadow:
            "inset -18px -22px 60px rgba(11,18,60,0.55), inset 14px 18px 50px rgba(255,255,255,0.45), 0 30px 70px -10px rgba(37,99,255,0.55)",
          animation: "uc-breathe 4.2s ease-in-out infinite",
        }}
      >
        {/* Inner liquid swirl */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 65% 70%, rgba(99,102,241,0.7), transparent 55%), radial-gradient(ellipse at 30% 60%, rgba(56,189,248,0.5), transparent 50%)",
            mixBlendMode: "screen",
            animation: "spin 22s linear infinite",
          }}
        />
        {/* Top specular highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top: "8%",
            left: "18%",
            width: "55%",
            height: "30%",
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)",
            filter: "blur(2px)",
          }}
        />
        {/* Subtle smile glow (mockup feeling) */}
        <div
          className="absolute"
          style={{
            bottom: "22%",
            left: "50%",
            width: "55%",
            height: "12%",
            transform: "translateX(-50%)",
            borderBottom: "2px solid rgba(189,231,255,0.85)",
            borderRadius: "0 0 100% 100% / 0 0 100% 100%",
            filter: "blur(1.5px)",
            opacity: 0.7,
          }}
        />
      </div>

      {/* Orbiting particles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.dot,
              height: p.dot,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95), rgba(189,231,255,0.6) 60%, transparent 100%)",
              boxShadow: "0 0 10px rgba(189,231,255,0.9)",
              ["--r" as never]: `${p.r}px`,
              animation: `uc-orbit ${p.d}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
