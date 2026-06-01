/**
 * VisualConversationPanel
 * Mobile-first split view: annotated image on top, AI findings + summary below.
 * Renders inline inside an Alex assistant message bubble.
 */
import { AIAnnotationLayer, Annotation, AnnotationSeverity } from "./AIAnnotationLayer";

export interface VisualFinding {
  label: string;
  severity?: AnnotationSeverity;
}

interface Props {
  imageUrl: string;
  annotations: Annotation[];
  findings: VisualFinding[];
  summary?: string;
  urgency?: AnnotationSeverity;
}

const urgencyChip: Record<AnnotationSeverity, string> = {
  low: "bg-primary/15 text-primary border-primary/20",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

const urgencyLabel: Record<AnnotationSeverity, string> = {
  low: "À surveiller",
  medium: "Attention",
  high: "Action recommandée",
  critical: "Urgent",
};

export function VisualConversationPanel({
  imageUrl,
  annotations,
  findings,
  summary,
  urgency,
}: Props) {
  return (
    <div className="mt-2 rounded-2xl overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm">
      {/* Image with annotation overlay */}
      <div className="relative w-full aspect-[4/3] bg-muted/40">
        <img
          src={imageUrl}
          alt="Analyse visuelle"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <AIAnnotationLayer annotations={annotations} />
      </div>

      {/* Findings panel */}
      <div className="p-3 space-y-2">
        {urgency && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${urgencyChip[urgency]}`}
            >
              {urgencyLabel[urgency]}
            </span>
          </div>
        )}

        {summary && (
          <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
        )}

        {findings.length > 0 && (
          <ul className="space-y-1 mt-1">
            {findings.map((f, i) => {
              const sev = f.severity ?? "medium";
              return (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      sev === "critical"
                        ? "bg-destructive"
                        : sev === "high"
                        ? "bg-orange-500"
                        : sev === "medium"
                        ? "bg-amber-400"
                        : "bg-primary"
                    }`}
                  />
                  <span className="leading-snug">{f.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default VisualConversationPanel;
