/**
 * Hero overlay — Housing Knowledge Graph (densifié, 38 nœuds).
 */
import { useMemo } from "react";

type NodeKind = "home" | "doc" | "shield" | "lens";

const KINDS: NodeKind[] = ["home", "doc", "shield", "lens"];

function buildNodes() {
  // Grille 8 × 5 avec jitter déterministe
  const nodes: Array<{ x: number; y: number; label: NodeKind }> = [];
  let seed = 0;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const baseX = 120 + col * 200;
      const baseY = 140 + row * 170;
      nodes.push({
        x: baseX + (rand() - 0.5) * 80,
        y: baseY + (rand() - 0.5) * 60,
        label: KINDS[(row * 8 + col) % KINDS.length],
      });
    }
  }
  return nodes;
}

function buildLinks(n: number) {
  // Chaque nœud relié à 2-3 voisins proches déterministes
  const links: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    if (i + 1 < n) links.push([i, i + 1]);
    if (i + 8 < n) links.push([i, i + 8]);
    if (i % 3 === 0 && i + 9 < n) links.push([i, i + 9]);
    if (i % 5 === 0 && i + 7 < n) links.push([i, i + 7]);
  }
  return links;
}

function NodeGlyph({ x, y, label }: { x: number; y: number; label: NodeKind }) {
  switch (label) {
    case "home":
      return <path d={`M ${x-10} ${y+7} L ${x} ${y-10} L ${x+10} ${y+7} L ${x+10} ${y+12} L ${x-10} ${y+12} Z`} />;
    case "doc":
      return <rect x={x-7} y={y-10} width="14" height="20" rx="1.8" />;
    case "shield":
      return <path d={`M ${x} ${y-11} L ${x+10} ${y-6} L ${x+10} ${y+4} Q ${x} ${y+13} ${x-10} ${y+4} L ${x-10} ${y-6} Z`} />;
    case "lens":
    default:
      return (
        <g>
          <circle cx={x-2} cy={y-2} r="7" />
          <line x1={x+4} y1={y+4} x2={x+10} y2={y+10} />
        </g>
      );
  }
}

export default function HousingKnowledgeGraph() {
  const nodes = useMemo(buildNodes, []);
  const links = useMemo(() => buildLinks(nodes.length), [nodes.length]);

  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.16 }}
    >
      <g stroke="#2563EB" strokeWidth="1.0" fill="none" strokeLinecap="round">
        {links.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            strokeDasharray="1200"
            style={{ animation: `ub-draw 30s ease-in-out ${i * 0.4}s infinite alternate` }}
          />
        ))}
      </g>
      <g stroke="#2563EB" strokeWidth="1.1" fill="none" strokeLinecap="round">
        {nodes.map((n, i) => (
          <NodeGlyph key={i} x={n.x} y={n.y} label={n.label} />
        ))}
      </g>
      <g fill="#3B82F6">
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x} cy={n.y} r="3.2"
            style={{ animation: `ub-twinkle 6s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </g>
    </svg>
  );
}
