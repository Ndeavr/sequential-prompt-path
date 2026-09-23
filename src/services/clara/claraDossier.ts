/**
 * UNPRO — Dossier maison : la mémoire du propriétaire, côté client.
 *
 * Aucune donnée n'est inventée ici : le Dossier maison affiche uniquement ce
 * que Clara a réellement enregistré dans la conversation canonique
 * (`clara-session`, table `property_dossier_entries`), avec sa provenance.
 */
import { supabase } from "@/integrations/supabase/client";
import { peekClaraSessionToken, ensureClaraSession } from "@/services/clara/claraSession";

export type DossierCategory =
  | "property"
  | "project"
  | "document"
  | "contractor"
  | "quote"
  | "appointment"
  | "note";

export type DossierProvenance = "verified" | "declared" | "inferred" | "pending";

export interface DossierEntry {
  id: string;
  category: DossierCategory;
  entry_key: string;
  label: string;
  detail: string | null;
  provenance: DossierProvenance;
  source: string | null;
  updated_at: string;
}

export const DOSSIER_UPDATED_EVENT = "unpro:dossier-maison-updated";
export const DOSSIER_OPEN_EVENT = "unpro:dossier-maison-open";

export const DOSSIER_SECTIONS: Array<{ key: DossierCategory; title: string; empty: string }> = [
  { key: "property", title: "Votre propriété", empty: "Adresse et type de propriété pas encore confirmés." },
  { key: "project", title: "Problèmes et projets", empty: "Aucun problème ou projet enregistré pour l'instant." },
  { key: "document", title: "Photos et documents", empty: "Aucune photo ni document reçu pour l'instant." },
  { key: "contractor", title: "Entrepreneurs", empty: "Aucun entrepreneur vérifié ou recommandé pour l'instant." },
  { key: "quote", title: "Soumissions", empty: "Aucune soumission analysée pour l'instant." },
  { key: "appointment", title: "Rendez-vous", empty: "Aucun rendez-vous planifié pour l'instant." },
  { key: "note", title: "Autres informations", empty: "Rien d'autre pour l'instant." },
];

export const PROVENANCE_LABEL: Record<DossierProvenance, string> = {
  verified: "Vérifié",
  declared: "Déclaré",
  inferred: "Inféré",
  pending: "À confirmer",
};

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T | null> {
  await ensureClaraSession();
  const token = peekClaraSessionToken();
  if (!token) return null;
  const { data, error } = await supabase.functions.invoke("clara-session", {
    body: { action, session_token: token, ...payload },
  });
  if (error) return null;
  const result = data as (T & { error?: string }) | null;
  if (result && typeof result === "object" && "error" in result && result.error) return null;
  return result as T;
}

export async function listDossierEntries(): Promise<DossierEntry[]> {
  const result = await call<{ entries: DossierEntry[] }>("dossier_list");
  return result?.entries ?? [];
}

export async function addDossierEntry(input: {
  category: DossierCategory;
  label: string;
  entryKey?: string;
  detail?: string;
  provenance?: DossierProvenance;
  source?: string;
}): Promise<DossierEntry | null> {
  const result = await call<{ entry: DossierEntry }>("dossier_add", {
    category: input.category,
    label: input.label,
    entry_key: input.entryKey ?? input.label,
    detail: input.detail,
    provenance: input.provenance ?? "declared",
    source: input.source,
  });
  if (result?.entry && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DOSSIER_UPDATED_EVENT));
  }
  return result?.entry ?? null;
}

/** Version tolérante : le dossier ne doit jamais bloquer la conversation. */
export function rememberInDossier(input: Parameters<typeof addDossierEntry>[0]): void {
  void addDossierEntry(input).catch(() => {});
}

/** Ouvre le Dossier maison sans quitter la conversation. */
export function openDossierMaison(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DOSSIER_OPEN_EVENT));
}

/**
 * Clara annonce parfois « je vais l'ajouter à votre dossier maison ».
 * Cette détection sert à ouvrir réellement le dossier après coup, jamais avant.
 */
const DOSSIER_MENTION =
  /(dossier\s+maison|votre\s+dossier|je\s+l['’]ajoute\s+à\s+votre\s+dossier|ajouté\s+à\s+votre\s+dossier)/i;

export function mentionsDossier(text: string): boolean {
  return DOSSIER_MENTION.test(text ?? "");
}
