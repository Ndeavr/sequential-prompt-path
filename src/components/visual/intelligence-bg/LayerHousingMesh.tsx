/**
 * Layer 2 — Housing Intelligence Mesh (densifié).
 * Courbes douces évoquant plans de maison + nœuds de connexion.
 */
interface Props {
  opacity?: number;
  stroke?: string;
}

export default function LayerHousingMesh({ opacity = 0.14, stroke = "#2563EB" }: Props) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none ub-mesh-shift"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <g fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round">
        {/* Courbes horizontales — plans de maison */}
        <path d="M -50 180 C 280 140, 520 280, 820 220 S 1380 160, 1700 240" />
        <path d="M -50 320 C 240 280, 560 420, 880 370 S 1420 320, 1700 380" />
        <path d="M -50 460 C 260 420, 540 540, 860 500 S 1400 440, 1700 520" />
        <path d="M -50 600 C 280 560, 600 680, 920 640 S 1440 580, 1700 640" />
        <path d="M -50 740 C 240 700, 560 820, 880 780 S 1420 720, 1700 780" />
        <path d="M -50 880 C 280 840, 600 960, 920 920 S 1440 860, 1700 900" />
        {/* Lignes verticales souples */}
        <path d="M 180 -50 C 160 220, 200 480, 180 760 S 160 1050, 180 1100" />
        <path d="M 440 -50 C 420 220, 460 480, 440 760 S 420 1050, 440 1100" />
        <path d="M 720 -50 C 700 220, 740 480, 720 760 S 700 1050, 720 1100" />
        <path d="M 980 -50 C 960 220, 1000 480, 980 760 S 960 1050, 980 1100" />
        <path d="M 1240 -50 C 1220 220, 1260 480, 1240 760 S 1220 1050, 1240 1100" />
        <path d="M 1460 -50 C 1440 220, 1480 480, 1460 760 S 1440 1050, 1460 1100" />
      </g>
      {/* Diagonales */}
      <g fill="none" stroke={stroke} strokeWidth="0.7" strokeLinecap="round" opacity="0.65">
        <path d="M -50 0 L 1700 1000" />
        <path d="M 1700 0 L -50 1000" />
        <path d="M -50 500 L 1700 0" />
        <path d="M -50 500 L 1700 1000" />
      </g>
      {/* Nœuds aux intersections */}
      <g fill={stroke}>
        {[
          [180, 180], [440, 220], [720, 220], [980, 200], [1240, 220], [1460, 240],
          [180, 320], [440, 370], [720, 370], [980, 360], [1240, 360], [1460, 380],
          [180, 460], [440, 500], [720, 500], [980, 490], [1240, 480], [1460, 520],
          [180, 600], [440, 640], [720, 640], [980, 640], [1240, 620], [1460, 640],
          [180, 740], [440, 780], [720, 780], [980, 770], [1240, 760], [1460, 780],
          [180, 880], [440, 920], [720, 920], [980, 910], [1240, 900], [1460, 900],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3.2" opacity="0.85" />
        ))}
      </g>
    </svg>
  );
}
