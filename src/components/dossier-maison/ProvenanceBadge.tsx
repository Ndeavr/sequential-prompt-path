/**
 * UNPRO — Niveau de vérité d'une information du Dossier maison.
 * Vérifié / Déclaré / Inféré / À confirmer. Jamais de promotion implicite.
 */
import { PROVENANCE_LABEL, type DossierProvenance } from "@/services/clara/claraDossier";

const STYLES: Record<DossierProvenance, string> = {
  verified: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  declared: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  inferred: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pending: "border-border bg-muted text-muted-foreground",
};

export default function ProvenanceBadge({ provenance }: { provenance: DossierProvenance }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${STYLES[provenance]}`}
    >
      {PROVENANCE_LABEL[provenance]}
    </span>
  );
}
