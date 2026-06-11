/**
 * Entrepreneurs overlay — Ville → Projet → Compatibilité → Entrepreneur
 * sous forme abstraite (4 colonnes de nœuds reliés). Opacité max 5%.
 */
const COLS = [
  { x: 220, color: "#3B82F6", count: 5 },
  { x: 620, color: "#0EA5E9", count: 7 },
  { x: 1020, color: "#6366F1", count: 5 },
  { x: 1380, color: "#7DD3FC", count: 3 },
];

export default function TerritoryRecommendationMesh() {
  const nodes = COLS.flatMap((c, ci) =>
    Array.from({ length: c.count }, (_, i) => ({
      x: c.x,
      y: 200 + ((i + 0.5) * 600) / c.count,
      color: c.color,
      col: ci,
    }))
  );

  // Liens : chaque nœud d'une colonne se connecte aux 2 plus proches de la suivante
  const links: Array<[number, number]> = [];
  COLS.forEach((_, ci) => {
    if (ci === COLS.length - 1) return;
    const left = nodes.filter((n) => n.col === ci);
    const right = nodes.filter((n) => n.col === ci + 1);
    left.forEach((l) => {
      const sorted = right
        .map((r) => ({ r, d: Math.abs(r.y - l.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      sorted.forEach(({ r }) => {
        links.push([nodes.indexOf(l), nodes.indexOf(r)]);
      });
    });
  });

  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.05 }}
    >
      <g stroke="#3B82F6" strokeWidth="0.6" fill="none">
        {links.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
          />
        ))}
      </g>
      <g>
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r="3" fill={n.color} />
        ))}
      </g>
    </svg>
  );
}
