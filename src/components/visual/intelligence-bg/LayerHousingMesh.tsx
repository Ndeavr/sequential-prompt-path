/**
 * Layer 2 — Housing Intelligence Mesh.
 * Courbes douces évoquant plans de maison + nœuds de connexion.
 * Pas de grille rigide. Pas de circuit imprimé.
 */
interface Props {
  opacity?: number;
  stroke?: string;
}

export default function LayerHousingMesh({ opacity = 0.05, stroke = "#2563EB" }: Props) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none ub-mesh-shift"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <g fill="none" stroke={stroke} strokeWidth="0.6" strokeLinecap="round">
        {/* Courbes plans de maison */}
        <path d="M -50 220 C 280 180, 520 320, 820 260 S 1380 200, 1700 280" />
        <path d="M -50 420 C 240 380, 560 520, 880 470 S 1420 420, 1700 480" />
        <path d="M -50 640 C 260 600, 540 720, 860 680 S 1400 620, 1700 700" />
        <path d="M -50 840 C 280 800, 600 920, 920 880 S 1440 820, 1700 880" />
        {/* Lignes verticales souples */}
        <path d="M 240 -50 C 220 220, 260 480, 240 760 S 220 1050, 240 1100" />
        <path d="M 640 -50 C 620 220, 660 480, 640 760 S 620 1050, 640 1100" />
        <path d="M 1040 -50 C 1020 220, 1060 480, 1040 760 S 1020 1050, 1040 1100" />
        <path d="M 1380 -50 C 1360 220, 1400 480, 1380 760 S 1360 1050, 1380 1100" />
      </g>
      {/* Nœuds aux intersections */}
      <g fill={stroke}>
        {[
          [240, 220], [640, 260], [1040, 240], [1380, 280],
          [240, 420], [640, 470], [1040, 460], [1380, 480],
          [240, 640], [640, 680], [1040, 660], [1380, 700],
          [240, 840], [640, 880], [1040, 870], [1380, 880],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.2" opacity="0.55" />
        ))}
      </g>
    </svg>
  );
}
