/**
 * DataProvenance — Transparence des sources.
 * Aucune donnée inventée : chaque bloc indique son statut (Vérifié / Déclaré / Inféré / En attente).
 */
import type { PublicSource } from "../hooks/useContractorRecommendation";

interface Props {
  contractor: any;
  sources: PublicSource[];
}

type Status = "verifie" | "declare" | "infere" | "attente";

const STATUS_LABEL: Record<Status, string> = {
  verifie: "Vérifié",
  declare: "Déclaré",
  infere: "Inféré",
  attente: "En attente",
};

const STATUS_CLASS: Record<Status, string> = {
  verifie: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  declare: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  infere: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  attente: "bg-muted text-muted-foreground border-border",
};

export function ProvenanceBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function DataProvenance({ contractor: c, sources }: Props) {
  const rows: { label: string; value: string; status: Status }[] = [
    {
      label: "Nom d'entreprise",
      value: c.business_name,
      status: c.admin_verified ? "verifie" : "declare",
    },
    {
      label: "Catégorie principale",
      value: c.specialty || "À confirmer",
      status: c.specialty ? "declare" : "attente",
    },
    {
      label: "Téléphone",
      value: c.phone || "À confirmer",
      status: c.phone ? "declare" : "attente",
    },
    {
      label: "Site web",
      value: c.website || "À confirmer",
      status: c.website ? "declare" : "attente",
    },
    {
      label: "Adresse civique",
      value: "Non publiée — à confirmer par l'entreprise",
      status: "attente",
    },
    {
      label: "Licence RBQ",
      value: c.rbq_number || "Non fournie — à valider au Registre RBQ",
      status: c.rbq_number ? "declare" : "attente",
    },
    {
      label: "Avis et note globale",
      value:
        c.rating && c.review_count
          ? `${c.rating} / 5 (${c.review_count} avis)`
          : "Aucune note agrégée disponible",
      status: c.rating && c.review_count ? "declare" : "attente",
    },
  ];

  return (
    <section aria-labelledby="provenance-heading" className="space-y-3">
      <h2 id="provenance-heading" className="text-lg font-semibold text-foreground">
        Origine des informations
      </h2>
      <p className="text-sm text-muted-foreground">
        UNPRO n'affiche que des informations issues de sources publiques ou déclarées. Rien n'est
        inventé et aucune vérification n'est présumée.
      </p>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{r.label}</p>
              <p className="text-sm text-foreground break-words">{r.value}</p>
            </div>
            <ProvenanceBadge status={r.status} />
          </div>
        ))}
      </div>

      {sources.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Sources publiques consultées
          </p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-sm text-primary underline underline-offset-2 break-all"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
