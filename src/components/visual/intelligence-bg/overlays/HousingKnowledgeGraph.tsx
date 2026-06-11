/**
 * Hero overlay — Housing Knowledge Graph.
 * Nœuds abstraits (maison, document, garantie, inspection) reliés par traits doux.
 */
const NODES = [
  { x: 200, y: 180, label: "home" },
  { x: 520, y: 120, label: "doc" },
  { x: 860, y: 220, label: "shield" },
  { x: 1200, y: 160, label: "lens" },
  { x: 320, y: 480, label: "doc" },
  { x: 720, y: 540, label: "home" },
  { x: 1080, y: 460, label: "shield" },
  { x: 1380, y: 540, label: "lens" },
  { x: 260, y: 780, label: "home" },
  { x: 640, y: 820, label: "doc" },
  { x: 1020, y: 760, label: "shield" },
];

const LINKS: Array<[number, number]> = [
  [0,1],[1,2],[2,3],[0,4],[1,5],[2,6],[3,7],
  [4,5],[5,6],[6,7],[4,8],[5,9],[6,10],[8,9],[9,10],
];

function NodeGlyph({ x, y, label }: { x: number; y: number; label: string }) {
  switch (label) {
    case "home":
      return <path d={`M ${x-8} ${y+6} L ${x} ${y-8} L ${x+8} ${y+6} L ${x+8} ${y+10} L ${x-8} ${y+10} Z`} />;
    case "doc":
      return <rect x={x-6} y={y-8} width="12" height="16" rx="1.5" />;
    case "shield":
      return <path d={`M ${x} ${y-9} L ${x+8} ${y-5} L ${x+8} ${y+3} Q ${x} ${y+11} ${x-8} ${y+3} L ${x-8} ${y-5} Z`} />;
    case "lens":
    default:
      return (
        <g>
          <circle cx={x-2} cy={y-2} r="6" />
          <line x1={x+3} y1={y+3} x2={x+8} y2={y+8} />
        </g>
      );
  }
}

export default function HousingKnowledgeGraph() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.06 }}
    >
      <g stroke="#2563EB" strokeWidth="0.7" fill="none" strokeLinecap="round">
        {LINKS.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            strokeDasharray="1200"
            style={{ animation: `ub-draw 30s ease-in-out ${i * 0.8}s infinite alternate` }}
          />
        ))}
      </g>
      <g stroke="#2563EB" strokeWidth="0.9" fill="none" strokeLinecap="round">
        {NODES.map((n, i) => (
          <NodeGlyph key={i} x={n.x} y={n.y} label={n.label} />
        ))}
      </g>
      <g fill="#3B82F6">
        {NODES.map((n, i) => (
          <circle
            key={i}
            cx={n.x} cy={n.y} r="2"
            style={{ animation: `ub-twinkle 6s ease-in-out ${i * 0.4}s infinite` }}
          />
        ))}
      </g>
    </svg>
  );
}
