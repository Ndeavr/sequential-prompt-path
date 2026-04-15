import type { AIPPv2AuditScores } from "@/hooks/useAIPPv2Audit";

const AXES = [
  { key: "score_aeo" as const, label: "AEO", weight: "30%" },
  { key: "score_authority" as const, label: "Autorité", weight: "25%" },
  { key: "score_conversion" as const, label: "Conversion", weight: "20%" },
  { key: "score_local" as const, label: "Local", weight: "15%" },
  { key: "score_tech" as const, label: "Tech SEO", weight: "10%" },
];

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

export default function WidgetRadarScoreBreakdown({ scores }: { scores: AIPPv2AuditScores }) {
  const cx = 150, cy = 150, maxR = 110;
  const step = (2 * Math.PI) / AXES.length;
  const offset = -Math.PI / 2;

  const points = AXES.map((a, i) => {
    const val = scores[a.key] / 100;
    const angle = offset + i * step;
    return polarToCartesian(cx, cy, maxR * val, angle);
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Répartition du score</h3>

      <svg viewBox="0 0 300 300" className="w-full max-w-[280px] mx-auto">
        {/* Grid rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={AXES.map((_, i) => {
              const p = polarToCartesian(cx, cy, maxR * r, offset + i * step);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5"
          />
        ))}

        {/* Axes */}
        {AXES.map((_, i) => {
          const p = polarToCartesian(cx, cy, maxR, offset + i * step);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />;
        })}

        {/* Data polygon */}
        <polygon points={polygon} fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="hsl(var(--primary))" />
        ))}

        {/* Labels */}
        {AXES.map((a, i) => {
          const p = polarToCartesian(cx, cy, maxR + 22, offset + i * step);
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">
              {a.label}
            </text>
          );
        })}
      </svg>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {AXES.map((a) => (
          <div key={a.key} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{a.label} ({a.weight})</span>
            <span className="font-semibold text-foreground">{scores[a.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
