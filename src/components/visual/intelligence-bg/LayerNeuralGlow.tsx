/**
 * Layer 6 — Halo neural intelligent (derrière l'orb Alex).
 */
interface Props {
  color?: string;
  size?: number;
}

export default function LayerNeuralGlow({
  color = "rgba(59,130,246,0.30)",
  size = 620,
}: Props) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="ub-neural-glow"
        style={{
          position: "absolute",
          top: "18%",
          right: "12%",
          width: size,
          height: size,
          borderRadius: "9999px",
          background: `radial-gradient(circle, ${color} 0%, rgba(59,130,246,0.08) 45%, transparent 75%)`,
        }}
      />
      <div
        className="ub-neural-glow"
        style={{
          position: "absolute",
          top: "22%",
          right: "16%",
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: "9999px",
          background: `radial-gradient(circle, rgba(125,211,252,0.25) 0%, transparent 70%)`,
          animationDelay: "2s",
        }}
      />
    </div>
  );
}
