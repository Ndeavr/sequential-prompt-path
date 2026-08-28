/**
 * « Pourquoi ce professionnel ? » — matching, never endorsement.
 * Displays only real, evidence-based factors. Any unverifiable superlative in
 * the supplied copy is sanitized before rendering.
 */
import { CheckCircle2, Sparkles } from "lucide-react";
import {
  UNPRO_SELECTION_STATEMENT,
  scanProhibitedClaims,
} from "@/lib/compliance/professionCompliance";

export interface MatchFactor {
  label: string;
  value?: string | null;
}

interface Props {
  factors: MatchFactor[];
  /** Optional narrative; sanitized against unverifiable claims. */
  narrative?: string | null;
  professionProhibitedClaims?: string[];
  className?: string;
}

export function WhyThisProfessional({
  factors,
  narrative,
  professionProhibitedClaims = [],
  className,
}: Props) {
  const real = factors.filter((f) => f.value != null && String(f.value).trim() !== "");
  if (real.length === 0 && !narrative) return null;

  const safeNarrative = narrative
    ? scanProhibitedClaims(narrative, professionProhibitedClaims).sanitized
    : null;

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className ?? ""}`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Pourquoi ce professionnel ?
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{UNPRO_SELECTION_STATEMENT}</p>

      <ul className="mt-3 space-y-2">
        {real.map((f) => (
          <li key={f.label} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>
              <span className="text-muted-foreground">{f.label} : </span>
              {f.value}
            </span>
          </li>
        ))}
      </ul>

      {safeNarrative && <p className="mt-3 text-sm text-muted-foreground">{safeNarrative}</p>}
    </div>
  );
}

export default WhyThisProfessional;
