/**
 * Layer 5 — Grande maison filaire fantôme (blueprint).
 * Évoque la mémoire structurelle de la maison.
 */
interface Props {
  opacity?: number;
  color?: string;
}

export default function LayerHouseBlueprintGhost({
  opacity = 0.14,
  color = "#3B82F6",
}: Props) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none ub-blueprint"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <g
        transform="translate(900 540) scale(1.05)"
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Corps principal */}
        <rect x="-360" y="-120" width="720" height="320" />
        {/* Toiture (pente) */}
        <path d="M -400 -120 L 0 -360 L 400 -120 Z" />
        {/* Cheminée */}
        <rect x="180" y="-300" width="50" height="120" />
        {/* Porte */}
        <rect x="-50" y="20" width="100" height="180" />
        <circle cx="30" cy="110" r="3" />
        {/* Fenêtres rez-de-chaussée */}
        <rect x="-280" y="-40" width="120" height="100" />
        <line x1="-280" y1="10" x2="-160" y2="10" />
        <line x1="-220" y1="-40" x2="-220" y2="60" />
        <rect x="160" y="-40" width="120" height="100" />
        <line x1="160" y1="10" x2="280" y2="10" />
        <line x1="220" y1="-40" x2="220" y2="60" />
        {/* Fenêtre toit (lucarne) */}
        <path d="M -120 -200 L -60 -260 L 0 -200 L 0 -130 L -120 -130 Z" />
        <line x1="-60" y1="-260" x2="-60" y2="-130" />
        {/* Fondations */}
        <line x1="-380" y1="210" x2="380" y2="210" />
        <line x1="-380" y1="220" x2="380" y2="220" strokeDasharray="6 8" />

        {/* Cotes / annotations blueprint */}
        <g strokeWidth="0.8" opacity="0.7">
          <line x1="-360" y1="240" x2="360" y2="240" />
          <line x1="-360" y1="230" x2="-360" y2="250" />
          <line x1="360" y1="230" x2="360" y2="250" />
          <line x1="-440" y1="-120" x2="-440" y2="200" />
          <line x1="-450" y1="-120" x2="-430" y2="-120" />
          <line x1="-450" y1="200" x2="-430" y2="200" />
        </g>
      </g>

      {/* Grille blueprint très subtile */}
      <g stroke={color} strokeWidth="0.3" opacity="0.18">
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="1000" />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 100} x2="1600" y2={i * 100} />
        ))}
      </g>
    </svg>
  );
}
