/**
 * Layer 1 — Gradient principal.
 * Light surface par défaut; tone="dark" pour le footer.
 */
interface Props {
  tone?: "light" | "dark";
}

export default function LayerGradientField({ tone = "light" }: Props) {
  const background =
    tone === "dark"
      ? "linear-gradient(180deg, #071120 0%, #0b1730 100%)"
      : `radial-gradient(circle at 20% 20%, rgba(59,130,246,0.12), transparent 40%),
         radial-gradient(circle at 80% 30%, rgba(14,165,233,0.08), transparent 35%),
         radial-gradient(circle at 50% 80%, rgba(99,102,241,0.08), transparent 40%),
         linear-gradient(180deg, #ffffff 0%, #f8fbff 35%, #f2f7ff 100%)`;

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background }}
    />
  );
}
