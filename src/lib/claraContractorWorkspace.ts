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
/**
 * entry_paid = the 350 $ entry proven by contractor_plan_code's signed LIVE
 * Stripe branch (no subscription row involved). Subscription states are shown
 * as such, never as "payment confirmed". plan_active = the server grants a
 * plan but its origin cannot be read here.
 */
export type ActivationEvidence =
  | "entry_paid" | "subscription_active" | "subscription_trialing" | "subscription_past_due"
  | "plan_active" | "free" | "none" | "unknown";
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
  /** Persisted server website reading; null/undefined = never run. */
  analysis?: { status: "succeeded" | "failed"; checkedAt: string; host: string; suggestions: number; pages: number } | null;
  /** True when some displayed values come from the existing UNPRO account. */
  usesAccountData?: boolean;
};

/** Recorded appointment rows grouped by their actual status. */
export type AppointmentTally = {
  total: number;
  confirmed: number;
  pending: number;
  closed: number;
  completed: number;
  other: number;
  /** false when only the total could be read. */
  breakdown: boolean;
};

export type AccountEvidence = {
  signedIn: boolean;
  activation: ActivationEvidence;
  publication: PublicationEvidence;
  /** null = unknown. */
  appointments: AppointmentTally | null;
};

const CONFIRMED = new Set(["confirmed", "scheduled", "accepted"]);
const PENDING = new Set(["requested", "under_review", "reschedule_requested", "callback_needed"]);
const CLOSED = new Set(["cancelled", "declined", "out_of_area", "bad_match"]);
/** Groups raw statuses; archived QA rows are excluded upstream. */
export function tallyAppointments(statuses: (string | null)[], total = statuses.length): AppointmentTally {
  const t: AppointmentTally = { total, confirmed: 0, pending: 0, closed: 0, completed: 0, other: 0, breakdown: total === statuses.length };
  for (const s of statuses) {
    if (s && CONFIRMED.has(s)) t.confirmed++;
    else if (s && PENDING.has(s)) t.pending++;
    else if (s && CLOSED.has(s)) t.closed++;
    else if (s === "completed") t.completed++;
    else t.other++;
  }
  return t;
}

export type WorkItem = { key: string; state: WorkState; title: string; detail: string };

/** One field accepts a business name or a public website. */
export function detectContractorEntry(value: string): { name: string; website: string } | null {
  const raw = value.trim();
  if (!raw) return null;
  const looksLikeUrl = !/\s/.test(raw) && (/^https?:\/\//i.test(raw) || /\.[a-z]{2,}(\/|$)/i.test(raw));
  // A rejected address (private host, credentials…) is never reused as a name.
  if (looksLikeUrl) return normalizeContractorEntry(raw, "website");
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

    const origin = draft?.usesAccountData
      ? t("Les informations affichées viennent de vos réponses et de votre compte UNPRO.", "The details shown come from your answers and your UNPRO account.")
      : t("Les informations affichées viennent de vos réponses.", "The details shown come from your answers.");
    const analysis = draft?.analysis;
    if (analysis?.status === "succeeded") {
      items.push({ key: "website", state: "done", title: t(`Site Web lu le ${day(analysis.checkedAt, fr)}`, `Website read on ${day(analysis.checkedAt, fr)}`), detail: [
        analysis.host,
        t(`${analysis.pages} page(s) lue(s)`, `${analysis.pages} page(s) read`),
        analysis.suggestions ? t(`${analysis.suggestions} suggestion(s) à examiner`, `${analysis.suggestions} suggestion(s) to review`) : t("Aucune information structurée trouvée", "No structured details found"),
      ].filter(Boolean).join(" · ") });
    } else if (analysis?.status === "failed") {
      items.push({ key: "website", state: "not_done", title: t("Lecture du site non réussie", "Website reading unsuccessful"), detail: `${day(analysis.checkedAt, fr)} · ${origin}` });
    } else if (draft?.website) {
      items.push({ key: "website", state: "not_done", title: t("Site Web noté, pas encore lu", "Website noted, not read yet"), detail: origin });
    } else {
      items.push({ key: "website", state: "not_done", title: t("Profil préparé sans site Web", "Profile prepared without a website"), detail: origin });
    }

    const missing = draft ? missingFieldLabels(draft.missingKeys, draft.trade, fr) : [];
    if (!draft || draft.missingKeys === null) items.push({ key: "confirm", state: "unknown", title: t("Informations à confirmer", "Details to confirm"), detail: t("Inconnu pour l'instant.", "Unknown for now.") });
    else if (draft.missingKeys.length === 0) items.push({ key: "confirm", state: "done", title: t("Réponses requises confirmées", "Required answers confirmed"), detail: t("Déclarées par vous.", "Declared by you.") });
    else items.push({ key: "confirm", state: "pending", title: t(`${draft.missingKeys.length} information(s) à confirmer`, `${draft.missingKeys.length} detail(s) to confirm`), detail: missing.join(" · ") });

    if (draft?.status === "completed") items.push({ key: "profile", state: "done", title: t("Profil complété", "Profile completed"), detail: draft.completedAt ? day(draft.completedAt, fr) : "" });
  }

  if (!account || !account.signedIn) {
    items.push({ key: "activation", state: input.returnedFromCheckout ? "pending" : "unknown", title: t("Activation", "Activation"), detail: input.returnedFromCheckout
      ? t("Confirmation de votre activation en cours. Connectez-vous à votre espace entrepreneur pour la suivre.", "Your activation is being confirmed. Sign in to your contractor space to follow it.")
      : t("Connectez-vous pour voir l'état confirmé par le serveur.", "Sign in to see the server-confirmed status.") });
    return items;
  }

  const activation: Record<ActivationEvidence, WorkItem> = {
    entry_paid: { key: "activation", state: "done", title: t("Activation 350 $ confirmée", "CAD350 activation confirmed"), detail: t("Paiement vérifié par le serveur à partir de la confirmation signée de Stripe.", "Payment verified by the server from Stripe's signed confirmation.") },
    subscription_active: { key: "activation", state: "done", title: t("Forfait actif", "Plan active"), detail: t("Abonnement actif selon le serveur.", "Subscription active according to the server.") },
    subscription_trialing: { key: "activation", state: "pending", title: t("Forfait en période d'essai", "Plan in trial"), detail: t("Selon le serveur.", "According to the server.") },
    subscription_past_due: { key: "activation", state: "pending", title: t("Paiement du forfait en retard", "Plan payment past due"), detail: t("Selon le serveur. Consultez votre facturation.", "According to the server. Check your billing.") },
    plan_active: { key: "activation", state: "done", title: t("Accès actif", "Access active"), detail: t("Accès accordé par le serveur. Le détail du paiement n'est pas lisible ici.", "Access granted by the server. Payment details are not readable here.") },
    free: { key: "activation", state: "done", title: t("Adhésion gratuite active", "Free membership active"), detail: t("Confirmée par le serveur.", "Confirmed by the server.") },
    none: input.returnedFromCheckout
      ? { key: "activation", state: "pending", title: t("Confirmation de votre activation en cours", "Your activation is being confirmed"), detail: t("Votre profil s'active dès que le paiement nous est confirmé. Inutile de payer à nouveau.", "Your profile activates as soon as payment is confirmed. No need to pay again.") }
      : { key: "activation", state: "not_done", title: t("Aucune activation confirmée", "No confirmed activation"), detail: t("Aucun paiement ni adhésion confirmé par le serveur.", "No payment or membership confirmed by the server.") },
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

  const a = account.appointments;
  if (a === null) items.push({ key: "appointments", state: "unknown", title: t("Rendez-vous", "Appointments"), detail: t("Inconnu pour l'instant.", "Unknown for now.") });
  else if (a.total === 0) items.push({ key: "appointments", state: "not_done", title: t("Aucun rendez-vous enregistré", "No appointments recorded"), detail: "" });
  else {
    const parts = a.breakdown ? [
      a.confirmed ? t(`${a.confirmed} confirmé(s) ou planifié(s)`, `${a.confirmed} confirmed or scheduled`) : "",
      a.pending ? t(`${a.pending} en attente`, `${a.pending} pending`) : "",
      a.closed ? t(`${a.closed} annulé(s) ou refusé(s)`, `${a.closed} cancelled or declined`) : "",
      a.completed ? t(`${a.completed} marqué(s) terminé(s)`, `${a.completed} marked completed`) : "",
      a.other ? t(`${a.other} autre(s) statut(s)`, `${a.other} other status(es)`) : "",
    ].filter(Boolean) : [t("Répartition par statut non lisible.", "Status breakdown not readable.")];
    items.push({
      key: "appointments",
      state: a.breakdown && a.confirmed > 0 ? "done" : "pending",
      title: t(`${a.total} demande(s) de rendez-vous enregistrée(s), tous statuts`, `${a.total} appointment request(s) recorded, all statuses`),
      detail: parts.join(" · "),
    });
  }

  return items;
}
