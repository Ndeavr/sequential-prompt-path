/**
 * Layer 3 — Dotted Intelligence Field.
 * Points concentrés top-right (silhouette toiture) + bottom-left (contour parcelle).
 */
import { useMemo } from "react";

interface Props {
  opacity?: number;
  color?: string;
}

function buildRoofDots(): Array<[number, number]> {
  // Silhouette toiture (triangle pente ~30°) au coin top-right
  const dots: Array<[number, number]> = [];
  const baseX = 1080;
  const baseY = 80;
  for (let row = 0; row < 22; row++) {
    const rowY = baseY + row * 14;
    const halfWidth = row * 12;
    for (let i = 0; i <= row; i++) {
      const x = baseX + 240 - halfWidth + i * 22;
      dots.push([x, rowY]);
    }
  }
  return dots;
}

function buildParcelDots(): Array<[number, number]> {
  // Contour de parcelle (rectangle déformé) bottom-left
  const dots: Array<[number, number]> = [];
  const left = 60;
  const top = 620;
  const right = 520;
  const bottom = 940;
  // Side perturbation pour effet "main libre"
  for (let x = left; x <= right; x += 16) {
    const wobble = Math.sin(x / 90) * 6;
    dots.push([x, top + wobble]);
    dots.push([x, bottom - wobble]);
  }
  for (let y = top; y <= bottom; y += 16) {
    const wobble = Math.cos(y / 80) * 6;
    dots.push([left + wobble, y]);
    dots.push([right - wobble, y]);
  }
  // Remplissage diagonal léger
  for (let i = 0; i < 60; i++) {
    const x = left + ((i * 37) % (right - left));
    const y = top + ((i * 53) % (bottom - top));
    dots.push([x, y]);
  }
  return dots;
}

export default function LayerDotIntelligenceField({
  opacity = 0.08,
  color = "#3B82F6",
}: Props) {
  const dots = useMemo(() => [...buildRoofDots(), ...buildParcelDots()], []);
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <g fill={color}>
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.3" />
        ))}
      </g>
    </svg>
  );
}
