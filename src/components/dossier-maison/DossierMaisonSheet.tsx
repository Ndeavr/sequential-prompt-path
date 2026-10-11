/**
 * UNPRO — Dossier maison.
 *
 * Mémoire persistante du propriétaire : ce que Clara apprend s'y dépose au fil
 * de la conversation. Le dossier s'ouvre PAR-DESSUS la conversation : aucune
 * navigation, aucun retour à l'accueil, aucun message perdu.
 *
 * Section « Propriété » : adresse choisie via les suggestions Google (serveur
 * `google-places-autocomplete`). Une adresse saisie à la main reste « À confirmer »;
 * « Vérifié » n'apparaît qu'après une réponse Google valide (place_id).
 */
import { useCallback, useEffect, useState } from "react";
import { FileImage, Home, MapPin, RefreshCw } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import AddressVerifiedInput from "@/components/address/AddressVerifiedInput";
import ProvenanceBadge from "@/components/dossier-maison/ProvenanceBadge";
import {
  DOSSIER_SECTIONS,
  DOSSIER_UPDATED_EVENT,
  PROPERTY_ADDRESS_KEY,
  addDossierEntry,
  listDossierEntries,
  type DossierEntry,
} from "@/services/clara/claraDossier";
import { isVerified, type VerifiedAddress } from "@/types/address";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ouvre directement le sélecteur d'adresse (action « Choisir mon adresse »). */
  editAddress?: boolean;
  /** Appelé seulement après une sauvegarde confirmée par le serveur. */
  onAddressSaved?: (entry: DossierEntry) => void;
}

/** Libellé lisible pour un fichier : jamais un nom numérique brut. */
export function describeDocument(entry: Pick<DossierEntry, "label" | "detail">): string {
  const raw = entry.label ?? "";
  const looksRaw = /^[\w-]*\d{4,}[\w-]*\.(jpe?g|png|heic|webp|pdf|mp4|mov)$/i.test(raw) || /^(img|image|photo|pxl|dsc)[_-]?\d+/i.test(raw);
  if (!looksRaw) return raw;
  if (/\.(pdf)$/i.test(raw)) return "Document PDF transmis";
  if (/\.(mp4|mov)$/i.test(raw)) return "Vidéo transmise";
  return "Photo transmise";
}

export default function DossierMaisonSheet({ open, onOpenChange, editAddress, onAddressSaved }: Props) {
  const [entries, setEntries] = useState<DossierEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState<VerifiedAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    if (open && editAddress) setEditing(true);
    if (!open) { setEditing(false); setSaveError(null); }
  }, [open, editAddress, load]);

  useEffect(() => {
    const onUpdated = () => {
      if (open) void load();
    };
    window.addEventListener(DOSSIER_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(DOSSIER_UPDATED_EVENT, onUpdated);
  }, [open, load]);

  const addressEntry = entries.find((e) => e.category === "property" && e.entry_key === PROPERTY_ADDRESS_KEY) ?? null;
  const otherProperty = entries.filter((e) => e.category === "property" && e.entry_key !== PROPERTY_ADDRESS_KEY);

  const raw = address ? (isVerified(address) ? address.fullAddress : address.raw.trim()) : "";
  const canSave = !!address && (isVerified(address) || raw.length >= 8);

  const save = async () => {
    if (!address || !canSave) return;
    setSaving(true);
    setSaveError(null);
    const verified = isVerified(address);
    const detail = verified
      ? [
          [address.streetNumber, address.streetName].filter(Boolean).join(" "),
          address.unit ? `unité ${address.unit}` : "",
          address.city,
          address.province,
          address.postalCode,
          `place_id:${address.placeId}`,
          address.latitude != null && address.longitude != null ? `${address.latitude},${address.longitude}` : "",
        ].filter(Boolean).join(" · ")
      : "Saisie manuelle — à confirmer";
    const entry = await addDossierEntry({
      category: "property",
      entryKey: PROPERTY_ADDRESS_KEY,
      label: raw,
      detail,
      provenance: verified ? "verified" : "pending",
      source: verified ? "google_places" : "manual",
    }).catch(() => null);
    setSaving(false);
    if (!entry) {
      setSaveError("L'adresse n'a pas été enregistrée. Réessayez.");
      return;
    }
    setEditing(false);
    setAddress(null);
    await load();
    onAddressSaved?.(entry);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(88dvh,var(--app-visible-height,88dvh))] overflow-y-auto rounded-t-3xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 sm:max-w-xl sm:mx-auto"
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

        <section aria-label="Propriété" className="mt-5 rounded-2xl border border-border bg-card/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" /> Propriété
              </h3>
              <p className="mt-1 break-words text-sm text-foreground" data-testid="dossier-address">
                {addressEntry ? addressEntry.label : "Adresse pas encore choisie."}
              </p>
            </div>
            {addressEntry && <ProvenanceBadge provenance={addressEntry.provenance} />}
          </div>
          {!editing ? (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setEditing(true)}>
              {addressEntry ? "Modifier l'adresse" : "Ajouter l'adresse"}
            </Button>
          ) : (
            <div className="mt-3 space-y-3">
              <AddressVerifiedInput
                value={address}
                onChange={setAddress}
                label="Adresse de la propriété"
                placeholder="Ex. 1234 rue Centrale, LaSalle"
              />
              {address && !isVerified(address) && raw.length >= 8 && (
                <p className="text-xs text-muted-foreground">
                  Sans suggestion choisie, l'adresse sera enregistrée « À confirmer ».
                </p>
              )}
              {saveError && <p className="text-sm text-destructive" role="alert">{saveError}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={!canSave || saving} onClick={() => void save()}>
                  {saving ? "Enregistrement…" : "Enregistrer l'adresse"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setAddress(null); }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </section>

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
            {DOSSIER_SECTIONS.map((section) => {
              const rows = section.key === "property"
                ? otherProperty
                : entries.filter((entry) => entry.category === section.key);
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
                        <div className="flex min-w-0 items-start gap-2">
                          {entry.category === "document" && <FileImage className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium text-foreground">
                              {entry.category === "document" ? describeDocument(entry) : entry.label}
                            </p>
                            {entry.detail && (
                              <p className="mt-1 break-words text-sm text-muted-foreground">{entry.detail}</p>
                            )}
                          </div>
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
