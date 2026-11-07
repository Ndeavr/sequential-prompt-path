/**
 * "Le travail de Clara pour votre entreprise" — pure evidence → panel rows.
 *
 * Every row is derived from persisted evidence only (saved matching draft,
 * server activation/publication state, appointment rows). Missing or
 * unreadable evidence is "unknown", never zero; nothing is staged or timed.
 */
import { normalizeContractorEntry } from "@/lib/contractorProfileEntry";
import { questionsForTrade } from "@/lib/matching/matchingQuestions";

export type WorkState = "done" | "pending" | "not_done" | "unknown";
export type ActivationEvidence = "confirmed" | "free" | "none" | "unknown";
export type PublicationEvidence = "none" | "unpublished" | "published_pending_verification" | "verified_active" | "unknown";

/** Saved matching draft as returned by the matching-profile function. */
export type DraftEvidence = {
  savedAt: string | null;
  status: string | null;
  completedAt: string | null;
  /** Server-computed missing required fields; null = not readable. */
  missingKeys: string[] | null;
  website: string | null;
  trade?: string | null;
};

export type AccountEvidence = {
  signedIn: boolean;
  activation: ActivationEvidence;
  publication: PublicationEvidence;
  /** Count of recorded appointment rows; null = unknown. */
  appointments: number | null;
};

export type WorkItem = { key: string; state: WorkState; title: string; detail: string };

/** One field accepts a business name or a public website. */
export function detectContractorEntry(value: string): { name: string; website: string } | null {
  const raw = value.trim();
  if (!raw) return null;
  const looksLikeUrl = !/\s/.test(raw) && (/^https?:\/\//i.test(raw) || /\.[a-z]{2,}(\/|$)/i.test(raw));
  if (looksLikeUrl) {
    const site = normalizeContractorEntry(raw, "website");
    if (site) return site;
  }
  return normalizeContractorEntry(raw, "name");
}

/** Saved answer → account record → nothing. Never overwrites a confirmed answer. */
export function dossierValue(saved: unknown, account: unknown): { value: string; source: "saved" | "account" | "none" } {
  if (typeof saved === "string" && saved.trim()) return { value: saved, source: "saved" };
  if (typeof account === "string" && account.trim()) return { value: account, source: "account" };
  return { value: "", source: "none" };
}

export function missingFieldLabels(keys: string[] | null, trade: string | null | undefined, fr: boolean): string[] {
  if (!keys) return [];
  const questions = questionsForTrade(trade ?? null);
  return keys.flatMap(key => {
    const q = questions.find(item => item.key === key);
    return q ? [fr ? q.label : q.label_en] : [];
  });
}

function day(iso: string, fr: boolean): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(fr ? "fr-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" });
}

export function buildClaraWorkItems(
  input: { draft?: DraftEvidence | null; account: AccountEvidence | null; returnedFromCheckout?: boolean },
  fr: boolean,
): WorkItem[] {
  const t = (f: string, e: string) => (fr ? f : e);
  const items: WorkItem[] = [];
  const { draft, account } = input;

  if (draft !== undefined) {
    items.push(draft?.savedAt
      ? { key: "dossier", state: "done", title: t("Dossier enregistré", "Dossier saved"), detail: day(draft.savedAt, fr) }
      : { key: "dossier", state: "pending", title: t("Dossier à enregistrer", "Dossier not saved yet"), detail: t("Confirmez votre entreprise pour l'enregistrer.", "Confirm your business to save it.") });

    items.push(draft?.website
      ? { key: "website", state: "not_done", title: t("Site Web noté", "Website noted"), detail: t("Lecture automatique non effectuée : chaque information vient de vous.", "No automatic reading performed: every detail comes from you.") }
      : { key: "website", state: "not_done", title: t("Profil préparé à partir de vos réponses", "Profile prepared from your answers"), detail: t("Aucun site Web indiqué.", "No website provided.") });

    const missing = draft ? missingFieldLabels(draft.missingKeys, draft.trade, fr) : [];
    if (!draft || draft.missingKeys === null) items.push({ key: "confirm", state: "unknown", title: t("Informations à confirmer", "Details to confirm"), detail: t("Inconnu pour l'instant.", "Unknown for now.") });
    else if (draft.missingKeys.length === 0) items.push({ key: "confirm", state: "done", title: t("Réponses requises confirmées", "Required answers confirmed"), detail: t("Déclarées par vous.", "Declared by you.") });
    else items.push({ key: "confirm", state: "pending", title: t(`${draft.missingKeys.length} information(s) à confirmer`, `${draft.missingKeys.length} detail(s) to confirm`), detail: missing.join(" · ") });

    if (draft?.status === "completed") items.push({ key: "profile", state: "done", title: t("Profil complété", "Profile completed"), detail: draft.completedAt ? day(draft.completedAt, fr) : "" });
  }

  if (!account || !account.signedIn) {
    items.push({ key: "activation", state: input.returnedFromCheckout ? "pending" : "unknown", title: t("Activation", "Activation"), detail: input.returnedFromCheckout
      ? t("Retour de Stripe reçu. Connectez-vous pour voir la confirmation du serveur.", "Back from Stripe. Sign in to see the server confirmation.")
      : t("Connectez-vous pour voir l'état confirmé par le serveur.", "Sign in to see the server-confirmed status.") });
    return items;
  }

  const activation: Record<ActivationEvidence, WorkItem> = {
    confirmed: { key: "activation", state: "done", title: t("Activation confirmée", "Activation confirmed"), detail: t("Paiement confirmé par le serveur.", "Payment confirmed by the server.") },
    free: { key: "activation", state: "done", title: t("Adhésion gratuite active", "Free membership active"), detail: t("Confirmée par le serveur.", "Confirmed by the server.") },
    none: input.returnedFromCheckout
      ? { key: "activation", state: "pending", title: t("Paiement en attente de confirmation", "Payment awaiting confirmation"), detail: t("Le retour de Stripe ne confirme pas le paiement. Actualisez dans un instant.", "Returning from Stripe does not confirm payment. Refresh in a moment.") }
      : { key: "activation", state: "not_done", title: t("Aucune activation confirmée", "No confirmed activation"), detail: t("Votre profil reste privé.", "Your profile remains private.") },
    unknown: { key: "activation", state: "unknown", title: t("Activation", "Activation"), detail: t("État non vérifiable pour l'instant.", "Status cannot be checked right now.") },
  };
  items.push(activation[account.activation]);

  const publication: Record<PublicationEvidence, WorkItem> = {
    none: { key: "publication", state: "not_done", title: t("Aucun profil public", "No public profile"), detail: t("Aucune fiche d'entreprise rattachée à ce compte.", "No business record linked to this account.") },
    unpublished: { key: "publication", state: "not_done", title: t("Profil non publié", "Profile not published"), detail: t("Préparé, visible par vous seulement.", "Prepared, visible to you only.") },
    published_pending_verification: { key: "publication", state: "pending", title: t("Publication en attente de vérification", "Publication awaiting verification"), detail: t("Vérification UNPRO requise avant toute recommandation.", "UNPRO verification required before any recommendation.") },
    verified_active: { key: "publication", state: "done", title: t("Profil publié et vérifié", "Profile published and verified"), detail: "" },
    unknown: { key: "publication", state: "unknown", title: t("Publication", "Publication"), detail: t("État non vérifiable pour l'instant.", "Status cannot be checked right now.") },
  };
  items.push(publication[account.publication]);

  items.push(account.appointments === null
    ? { key: "appointments", state: "unknown", title: t("Rendez-vous", "Appointments"), detail: t("Inconnu pour l'instant.", "Unknown for now.") }
    : account.appointments === 0
      ? { key: "appointments", state: "not_done", title: t("Aucun rendez-vous enregistré", "No appointments recorded"), detail: "" }
      : { key: "appointments", state: "done", title: t(`${account.appointments} rendez-vous enregistré(s)`, `${account.appointments} appointment(s) recorded`), detail: "" });

  return items;
}
