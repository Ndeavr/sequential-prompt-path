/**
 * Evidence labels for the CRM manual queue.
 * A send attempt, tracking click or checkout event does not prove delivery,
 * customer interest or paid activation. Presentation is read-only.
 */
export type ContactEvidenceInput = {
  opted_out?: boolean | null;
  sms_sent?: number | null;
  sms_delivered?: number | null;
  sms_undelivered?: number | null;
  sms_failed?: number | null;
  emails_sent?: number | null;
  sent_at?: string | null;
  last_sent_at?: string | null;
  delivered_at?: string | null;
  last_email_at?: string | null;
  clicked_at?: string | null;
  last_outcome?: string | null;
};

export type ContactEvidenceKey =
  | "no_trace"
  | "attempted"
  | "delivered_crm"
  | "email_sent"
  | "undelivered"
  | "clicked"
  | "outcome_logged"
  | "opted_out";

export type ContactEvidenceBadge = {
  key: ContactEvidenceKey;
  label: string;
  detail: string;
  date: string | null;
};

export const CONTACT_EVIDENCE_FILTERS: Array<{ value: "all" | ContactEvidenceKey; label: string }> = [
  { value: "all", label: "Tous les contacts" },
  { value: "no_trace", label: "Aucune trace d’envoi" },
  { value: "attempted", label: "Envoi tenté" },
  { value: "delivered_crm", label: "Livré selon CRM" },
  { value: "email_sent", label: "Courriel envoyé" },
  { value: "undelivered", label: "SMS non livré" },
  { value: "clicked", label: "Lien cliqué" },
  { value: "outcome_logged", label: "Suivi consigné" },
  { value: "opted_out", label: "Ne pas contacter" },
];

export function contactEvidence(row: ContactEvidenceInput): ContactEvidenceBadge[] {
  const count = (n?: number | null) => Math.max(0, Number(n) || 0);
  if (row.opted_out === true) {
    return [{
      key: "opted_out",
      label: "Ne pas contacter",
      detail: "Opposition enregistrée. Ne déclencher aucune communication.",
      date: null,
    }];
  }

  const badges: ContactEvidenceBadge[] = [];
  const smsDelivered = count(row.sms_delivered);
  const smsUndelivered = count(row.sms_undelivered) + count(row.sms_failed);
  const emailsSent = count(row.emails_sent);
  const smsSent = count(row.sms_sent);

  if (smsDelivered > 0) badges.push({
    key: "delivered_crm",
    label: "SMS livré (CRM) · " + smsDelivered,
    detail: "Statut agrégé du CRM; confirmation du fournisseur à recouper avant toute affirmation au client.",
    date: row.delivered_at ?? null,
  });
  if (smsUndelivered > 0) badges.push({
    key: "undelivered",
    label: "SMS non livré · " + smsUndelivered,
    detail: "Échec enregistré; ne pas réessayer le même canal sans vérifier son admissibilité.",
    date: null,
  });
  if (emailsSent > 0) badges.push({
    key: "email_sent",
    label: "Courriel envoyé · " + emailsSent,
    detail: "Envois enregistrés; livraison et lecture non confirmées.",
    date: row.last_email_at ?? null,
  });
  if (smsSent > 0 || row.sent_at) badges.push({
    key: "attempted",
    label: "Envoi tenté",
    detail: "Tentative enregistrée; ne prouve pas la réception.",
    date: row.last_sent_at ?? row.sent_at ?? null,
  });
  if (row.clicked_at) badges.push({
    key: "clicked",
    label: "Clic enregistré",
    detail: "Un clic ne prouve pas l’identité du visiteur ni son intérêt commercial.",
    date: row.clicked_at,
  });
  if (row.last_outcome) badges.push({
    key: "outcome_logged",
    label: "Résultat consigné",
    detail: "Issue saisie dans le CRM; ne prouve pas nécessairement une réponse entrante.",
    date: null,
  });

  return badges.length ? badges : [{
    key: "no_trace",
    label: "Aucun envoi tracé",
    detail: "Aucune trace dans les sources agrégées du CRM; un contact externe reste possible.",
    date: null,
  }];
}

export function matchesContactEvidence(
  row: ContactEvidenceInput,
  status: "all" | ContactEvidenceKey,
): boolean {
  return status === "all" || contactEvidence(row).some((e) => e.key === status);
}
