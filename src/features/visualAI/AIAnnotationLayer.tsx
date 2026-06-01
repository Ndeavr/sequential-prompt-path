/**
 * AIAnnotationLayer
 * SVG overlay rendering AI-detected annotations on top of an uploaded image.
 * Uses existing theme tokens (no new colors). Mobile-first.
 */
import { motion } from "framer-motion";

export type AnnotationSeverity = "low" | "medium" | "high" | "critical";

export interface Annotation {
  /** Normalized 0..1 bbox: x = left, y = top, w = width, h = height */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  severity?: AnnotationSeverity;
}

interface Props {
  annotations: Annotation[];
  className?: string;
}

const severityClass: Record<AnnotationSeverity, string> = {
  low: "stroke-primary/70 fill-primary/5",
  medium: "stroke-amber-400/80 fill-amber-400/10",
  high: "stroke-orange-500/90 fill-orange-500/10",
  critical: "stroke-destructive fill-destructive/15",
};

const labelBgClass: Record<AnnotationSeverity, string> = {
  low: "bg-primary/80 text-primary-foreground",
  medium: "bg-amber-500/90 text-white",
  high: "bg-orange-500/90 text-white",
  critical: "bg-destructive text-destructive-foreground",
};

export function AIAnnotationLayer({ annotations, className }: Props) {
  if (!annotations?.length) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className ?? ""}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        {annotations.map((a, i) => {
          const sev = a.severity ?? "medium";
          return (
            <motion.rect
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              x={a.x * 100}
              y={a.y * 100}
              width={a.w * 100}
              height={a.h * 100}
              rx={1.5}
              ry={1.5}
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
              className={severityClass[sev]}
            />
          );
        })}
      </svg>

      {/* Floating labels anchored to bbox top-left */}
      {annotations.map((a, i) => {
        const sev = a.severity ?? "medium";
        return (
          <motion.div
            key={`l-${i}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
            className="absolute"
            style={{
              left: `${a.x * 100}%`,
              top: `${a.y * 100}%`,
              transform: "translate(-2px, -100%)",
            }}
          >
            <span
              className={`inline-block text-[10px] leading-none font-medium px-1.5 py-1 rounded-md shadow-sm ${labelBgClass[sev]}`}
            >
              {a.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default AIAnnotationLayer;
