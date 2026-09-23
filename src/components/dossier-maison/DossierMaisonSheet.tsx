/**
 * UNPRO — Dossier maison.
 *
 * Mémoire persistante du propriétaire : ce que Clara apprend s'y dépose au fil
 * de la conversation. Le dossier s'ouvre PAR-DESSUS la conversation : aucune
 * navigation, aucun retour à l'accueil, aucun message perdu.
 */
import { useCallback, useEffect, useState } from "react";
import { Home, RefreshCw } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ProvenanceBadge from "@/components/dossier-maison/ProvenanceBadge";
import {
  DOSSIER_SECTIONS,
  DOSSIER_UPDATED_EVENT,
  listDossierEntries,
  type DossierEntry,
} from "@/services/clara/claraDossier";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DossierMaisonSheet({ open, onOpenChange }: Props) {
  const [entries, setEntries] = useState<DossierEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setEntries(await listDossierEntries());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    const onUpdated = () => {
      if (open) void load();
    };
    window.addEventListener(DOSSIER_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(DOSSIER_UPDATED_EVENT, onUpdated);
  }, [open, load]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-5 sm:max-w-xl sm:mx-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Home className="h-4 w-4" aria-hidden="true" />
            Dossier maison
          </SheetTitle>
          <SheetDescription>
            Ce que Clara a réellement enregistré sur votre propriété. Rien n'est ajouté sans votre échange.
          </SheetDescription>
        </SheetHeader>

        {loading && <p className="mt-6 text-sm text-muted-foreground">Chargement de votre dossier…</p>}

        {failed && (
          <div className="mt-6 space-y-2">
            <p className="text-sm text-foreground">Je n'ai pas réussi à afficher votre dossier.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Réessayer
            </button>
          </div>
        )}

        {!loading && !failed && (
          <div className="mt-5 space-y-6">
            {entries.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Votre dossier est encore vide. Chaque information partagée avec Clara viendra s'y ajouter.
              </p>
            )}

            {DOSSIER_SECTIONS.map((section) => {
              const rows = entries.filter((entry) => entry.category === section.key);
              if (rows.length === 0) return null;
              return (
                <section key={section.key} aria-label={section.title}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{section.title}</h3>
                  <ul className="space-y-2">
                    {rows.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-foreground">{entry.label}</p>
                          {entry.detail && (
                            <p className="mt-1 break-words text-sm text-muted-foreground">{entry.detail}</p>
                          )}
                        </div>
                        <ProvenanceBadge provenance={entry.provenance} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
