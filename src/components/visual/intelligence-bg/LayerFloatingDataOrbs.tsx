/**
 * Layer 4 — Floating Data Orbs.
 * 4 orbes blurés qui dérivent très lentement. CSS-only (pas de rerender React).
 */
interface Props {
  tone?: "light" | "dark";
}

const ORBS = [
  { color: "#3B82F6", size: 480, top: "-8%", left: "-6%", anim: "ub-orb-drift-1", duration: "32s", opacity: 0.22 },
  { color: "#0EA5E9", size: 420, top: "10%", right: "-8%", anim: "ub-orb-drift-2", duration: "38s", opacity: 0.18 },
  { color: "#6366F1", size: 520, bottom: "-12%", left: "-4%", anim: "ub-orb-drift-3", duration: "28s", opacity: 0.20 },
  { color: "#7DD3FC", size: 360, bottom: "0%", right: "-6%", anim: "ub-orb-drift-4", duration: "34s", opacity: 0.16 },
];

export default function LayerFloatingDataOrbs({ tone = "light" }: Props) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="ub-orb"
          style={{
            width: o.size,
            height: o.size,
            top: o.top,
            bottom: o.bottom,
            left: o.left,
            right: o.right,
            background: o.color,
            opacity: tone === "dark" ? o.opacity * 0.7 : o.opacity,
            animation: `${o.anim} ${o.duration} ease-in-out infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
