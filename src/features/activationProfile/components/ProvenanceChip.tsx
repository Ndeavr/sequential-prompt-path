/**
 * ProvenanceChip — makes the origin of every displayed fact explicit.
 * UNPRO never invents data; this chip proves it.
 */
import { BadgeCheck, PenLine, Sparkles } from "lucide-react";
import type { Provenance } from "../types";
import { PROVENANCE_LABEL } from "../types";

const STYLES: Record<Provenance, string> = {
  verified: "bg-emerald-400/12 text-emerald-200 border-emerald-300/25",
  declared: "bg-sky-400/12 text-sky-200 border-sky-300/25",
  inferred: "bg-amber-400/12 text-amber-100 border-amber-300/25",
};

const ICONS: Record<Provenance, typeof BadgeCheck> = {
  verified: BadgeCheck,
  declared: PenLine,
  inferred: Sparkles,
};

export default function ProvenanceChip({ provenance, source }: { provenance: Provenance; source?: string }) {
  const Icon = ICONS[provenance];
  return (
    <span
      title={source ? `${PROVENANCE_LABEL[provenance]} — ${source}` : PROVENANCE_LABEL[provenance]}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${STYLES[provenance]}`}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {PROVENANCE_LABEL[provenance]}
    </span>
  );
}
