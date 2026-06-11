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
      : `radial-gradient(circle at 18% 18%, rgba(59,130,246,0.22), transparent 42%),
         radial-gradient(circle at 82% 28%, rgba(14,165,233,0.18), transparent 38%),
         radial-gradient(circle at 50% 82%, rgba(99,102,241,0.16), transparent 42%),
         radial-gradient(circle at 88% 88%, rgba(37,99,235,0.14), transparent 40%),
         linear-gradient(180deg, #f0f5ff 0%, #eaf1fe 40%, #e3ecfd 100%)`;

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background }}
    />
  );
}
