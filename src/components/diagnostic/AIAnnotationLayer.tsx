/**
 * AIAnnotationLayer — Renders SVG overlay markers (circles, arrows, heat zones)
 * on top of the analyzed image. Coordinates are normalized 0-1.
 */
export interface Annotation {
  id?: string;
  type: "circle" | "rect" | "heat" | "arrow";
  /** Normalized 0-1. */
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  severity: "low" | "medium" | "high" | "critical";
}

const SEVERITY_COLORS: Record<Annotation["severity"], { stroke: string; fill: string }> = {
  low: { stroke: "#7dd3fc", fill: "rgba(125,211,252,0.18)" },
  medium: { stroke: "#fbbf24", fill: "rgba(251,191,36,0.20)" },
  high: { stroke: "#fb7185", fill: "rgba(251,113,133,0.22)" },
  critical: { stroke: "#ef4444", fill: "rgba(239,68,68,0.28)" },
};

interface Props {
  annotations: Annotation[];
}

export default function AIAnnotationLayer({ annotations }: Props) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {annotations.map((a, idx) => {
        const colors = SEVERITY_COLORS[a.severity];
        const key = a.id ?? `${a.type}-${idx}`;
        const cx = a.x * 100;
        const cy = a.y * 100;
        if (a.type === "circle") {
          const r = ((a.w ?? 0.1) * 100) / 2;
          return (
            <g key={key}>
              <circle cx={cx} cy={cy} r={r} fill={colors.fill} stroke={colors.stroke}
                strokeWidth={0.4} vectorEffect="non-scaling-stroke">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        }
        if (a.type === "rect" || a.type === "heat") {
          const w = (a.w ?? 0.1) * 100;
          const h = (a.h ?? 0.1) * 100;
          return (
            <rect key={key} x={cx - w / 2} y={cy - h / 2} width={w} height={h}
              rx={1} fill={colors.fill} stroke={colors.stroke}
              strokeWidth={0.4} strokeDasharray="1.2 0.8" vectorEffect="non-scaling-stroke" />
          );
        }
        return null;
      })}
    </svg>
  );
}
