/**
 * Layer 1 — Gradient principal (intensité ×2).
 */
interface Props {
  tone?: "light" | "dark";
}

export default function LayerGradientField({ tone = "light" }: Props) {
  const background =
    tone === "dark"
      ? "linear-gradient(180deg, #050d1f 0%, #0b1730 60%, #0a1e3c 100%)"
      : `radial-gradient(circle at 15% 12%, rgba(59,130,246,0.08), transparent 28%),
         radial-gradient(circle at 88% 25%, rgba(14,165,233,0.06), transparent 25%),
         radial-gradient(circle at 50% 88%, rgba(99,102,241,0.05), transparent 30%),
         linear-gradient(180deg, #fdfdff 0%, #f7f9fc 50%, #f2f5fa 100%)`;

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background }}
    />
  );
}
