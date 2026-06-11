/**
 * Layer 3 — Dotted Intelligence Field (densifié).
 * Toiture top-right + parcelle bottom-left + pignon top-left.
 */
import { useMemo } from "react";

interface Props {
  opacity?: number;
  color?: string;
}

function buildRoofDots(): Array<[number, number]> {
  const dots: Array<[number, number]> = [];
  const baseX = 1060;
  const baseY = 60;
  for (let row = 0; row < 28; row++) {
    const rowY = baseY + row * 12;
    const halfWidth = row * 11;
    for (let i = 0; i <= row; i++) {
      const x = baseX + 260 - halfWidth + i * 20;
      dots.push([x, rowY]);
    }
  }
  return dots;
}

function buildGableDots(): Array<[number, number]> {
  // Pignon (triangle inversé) top-left
  const dots: Array<[number, number]> = [];
  const baseX = 80;
  const baseY = 80;
  for (let row = 0; row < 20; row++) {
    const rowY = baseY + row * 12;
    const halfWidth = row * 10;
    for (let i = 0; i <= row; i++) {
      const x = baseX + halfWidth - row * 5 + i * 18;
      dots.push([x, rowY]);
    }
  }
  return dots;
}

function buildParcelDots(): Array<[number, number]> {
  const dots: Array<[number, number]> = [];
  const left = 40;
  const top = 580;
  const right = 600;
  const bottom = 960;
  for (let x = left; x <= right; x += 10) {
    const wobble = Math.sin(x / 90) * 7;
    dots.push([x, top + wobble]);
    dots.push([x, bottom - wobble]);
  }
  for (let y = top; y <= bottom; y += 10) {
    const wobble = Math.cos(y / 80) * 7;
    dots.push([left + wobble, y]);
    dots.push([right - wobble, y]);
  }
  for (let i = 0; i < 140; i++) {
    const x = left + ((i * 37) % (right - left));
    const y = top + ((i * 53) % (bottom - top));
    dots.push([x, y]);
  }
  return dots;
}

export default function LayerDotIntelligenceField({
  opacity = 0.20,
  color = "#3B82F6",
}: Props) {
  const dots = useMemo(
    () => [...buildRoofDots(), ...buildGableDots(), ...buildParcelDots()],
    []
  );
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <defs>
        <filter id="ub-dot-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      <g fill={color} filter="url(#ub-dot-glow)">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.0" />
        ))}
      </g>
    </svg>
  );
}
