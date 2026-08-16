/**
 * UNPRO — Provenance Badge
 * Vérifié / Déclaré / Inféré / À confirmer.
 * Used everywhere Passeport Maison data is displayed so a homeowner
 * always knows whether an information is proven, declared or deduced.
 */
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PROVENANCE_LABELS, type ProvenanceKind } from "@/lib/copy/passportPositioning";
import { ShieldCheck, User, Sparkles, HelpCircle } from "lucide-react";

const ICONS: Record<ProvenanceKind, React.ElementType> = {
  verified: ShieldCheck,
  declared: User,
  inferred: Sparkles,
  unconfirmed: HelpCircle,
};

const STYLES: Record<ProvenanceKind, string> = {
  verified: "border-success/30 bg-success/10 text-success",
  declared: "border-primary/30 bg-primary/10 text-primary",
  inferred: "border-accent/30 bg-accent/10 text-accent",
  unconfirmed: "border-muted-foreground/25 bg-muted/40 text-muted-foreground",
};

export function normalizeProvenance(value?: string | null): ProvenanceKind {
  if (value && value in PROVENANCE_LABELS) return value as ProvenanceKind;
  return "declared";
}

interface Props {
  provenance?: string | null;
  className?: string;
  compact?: boolean;
}

export default function ProvenanceBadge({ provenance, className, compact }: Props) {
  const kind = normalizeProvenance(provenance);
  const meta = PROVENANCE_LABELS[kind];
  const Icon = ICONS[kind];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1 px-1.5 py-0 text-[10px] font-medium ${STYLES[kind]} ${className ?? ""}`}
          >
            <Icon className="h-2.5 w-2.5" aria-hidden />
            {!compact && meta.label}
            <span className="sr-only">{meta.label} — {meta.help}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <span className="font-semibold">{meta.label}</span> — {meta.help}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
