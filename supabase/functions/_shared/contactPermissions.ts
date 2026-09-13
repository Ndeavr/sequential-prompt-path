/**
 * UNPRO — Permissions de contact au niveau destination (logique pure).
 *
 * Source de vérité : `v_commercial_send_eligibility` (preuve CASL par
 * destination) + marqueurs de conformité du lead. La simple présence d'un
 * numéro ou d'un courriel n'autorise JAMAIS un envoi commercial.
 *
 * L'appel téléphonique manuel composé par l'opérateur n'est pas un message
 * électronique commercial au sens de la LCAP : il reste permis tant que le
 * prospect n'est pas en retrait (do_not_contact / désabonné / supprimé).
 */

export interface SendEligibilityRow {
  contractor_lead_id: string;
  compliance_review_required: boolean | null;
  compliance_review_reason: string | null;
  valid_phone_evidence_count: number | null;
  valid_email_evidence_count: number | null;
  phone_suppressed: boolean | null;
  email_suppressed: boolean | null;
}

export interface ContactPermissionInput {
  /** Ligne d'éligibilité canonique, ou null si le prospect n'est pas relié à un contractor_lead. */
  eligibility: SendEligibilityRow | null;
  has_phone: boolean;
  has_email: boolean;
  do_not_contact?: boolean | null;
  unsubscribed?: boolean | null;
}

export interface ContactPermissions {
  can_call: boolean;
  can_sms: boolean;
  can_email: boolean;
  /** Vrai dès qu'aucun canal électronique commercial n'est autorisé. */
  research_only: boolean;
  reasons: {
    call: string | null;
    sms: string | null;
    email: string | null;
  };
}

const R = {
  no_phone: "Aucun numéro de téléphone vérifié.",
  no_email: "Aucune adresse courriel.",
  opted_out: "Cette entreprise a demandé à ne pas être contactée.",
  unsubscribed: "Cette entreprise s'est désabonnée.",
  not_linked: "Aucun dossier de conformité relié : envoi impossible tant que la preuve LCAP n'est pas rattachée.",
  compliance: "Révision de conformité requise avant tout envoi.",
  no_evidence: "Aucune preuve LCAP valide pour cette destination.",
  suppressed: "Destination dans l'index de suppression.",
};

/** Calcule les permissions réelles. Échec fermé par défaut. */
export function computeContactPermissions(input: ContactPermissionInput): ContactPermissions {
  const optedOut = input.do_not_contact === true;
  const unsub = input.unsubscribed === true;

  let call: string | null = null;
  if (!input.has_phone) call = R.no_phone;
  else if (optedOut) call = R.opted_out;
  else if (unsub) call = R.unsubscribed;

  const electronic = (kind: "sms" | "email"): string | null => {
    const has = kind === "sms" ? input.has_phone : input.has_email;
    if (!has) return kind === "sms" ? R.no_phone : R.no_email;
    if (optedOut) return R.opted_out;
    if (unsub) return R.unsubscribed;
    const e = input.eligibility;
    if (!e) return R.not_linked;
    if (e.compliance_review_required === true) {
      return e.compliance_review_reason ? `${R.compliance} (${e.compliance_review_reason})` : R.compliance;
    }
    const suppressed = kind === "sms" ? e.phone_suppressed : e.email_suppressed;
    if (suppressed === true) return R.suppressed;
    const count = Number((kind === "sms" ? e.valid_phone_evidence_count : e.valid_email_evidence_count) ?? 0);
    if (count <= 0) return R.no_evidence;
    return null;
  };

  const smsReason = electronic("sms");
  const emailReason = electronic("email");

  return {
    can_call: call === null,
    can_sms: smsReason === null,
    can_email: emailReason === null,
    research_only: smsReason !== null && emailReason !== null,
    reasons: { call, sms: smsReason, email: emailReason },
  };
}
