/**
 * UNPRO — RBQ self-declaration (DECLARED) vs verified state (VERIFIED).
 * A declaration never grants verification nor regulated-work eligibility.
 * Only `rbq_compliance_status === "verified"` (set by admin/service) does.
 */
import { getRbqApplicability, getRbqCompliance, type RbqStatus } from "./rbqStatus";

export type RbqDeclaration = "has_license" | "not_required" | "in_progress" | "unsure" | "other" | "employer_licensed";

export const RBQ_DECLARATION_OPTIONS: { value: RbqDeclaration; label: string; hint: string }[] = [
  { value: "has_license", label: "J'ai une licence RBQ", hint: "Votre numéro sera vérifié auprès du registre officiel." },
  { value: "not_required", label: "Mon activité ne requiert pas de licence RBQ", hint: "Déclaration examinée par UNPRO selon vos travaux précis." },
  { value: "in_progress", label: "Ma licence est en cours d'obtention", hint: "Vous pouvez compléter votre fiche en attendant." },
  { value: "unsure", label: "Je ne sais pas si j'en ai besoin", hint: "Clara vous pose une question, puis UNPRO examine." },
  { value: "employer_licensed", label: "Je travaille pour une entreprise titulaire d'une licence RBQ", hint: "Employé ou représentant mandaté. Les sous-traitants doivent avoir leur propre licence." },
  { value: "other", label: "Autre situation", hint: "Licence expirée, suspendue, autre organisme, sous-traitants…" },
];

export interface RbqDeclarationDetails {
  activities?: string;
  reason?: string;
  expected_date?: string;
  situation?: "expired" | "suspended" | "revoked" | "other_body" | "subcontractors" | "other";
  notes?: string;
  employer_legal_name?: string;
  employer_rbq?: string;
  /** employee | representative = possible affiliation; independent = needs own licence. */
  employer_relationship?: "employee" | "representative" | "independent";
}

export type RbqMarker = "VERIFIED" | "DECLARED" | "PENDING" | "INFERRED";

export interface RbqDashboardState {
  kind: "pending_employer_authorization" | "independent_needs_own_licence" | "verified" | "blocked" | "declared_exempt" | "in_progress" | "unsure" | "under_review" | "needs_rbq" | "clarify" | "not_required_inferred";
  marker: RbqMarker;
  title: string;
  detail: string;
  /** True while the RBQ topic is the contractor's next action. */
  isNextAction: boolean;
  /** Regulated work may be assigned. Only true with a verified, non-expired licence. */
  regulatedEligible: boolean;
}

export function getRbqDashboardState(p: {
  specialty?: string | string[] | null;
  services?: string[] | null;
  rbq_number?: string | null;
  rbq_compliance_status?: RbqStatus | string | null;
  rbq_expiry_date?: string | null;
  rbq_declaration?: string | null;
  rbq_declaration_details?: RbqDeclarationDetails | null;
}): RbqDashboardState {
  const compliance = getRbqCompliance({
    rbq_compliance_status: (p.rbq_compliance_status as RbqStatus) ?? "not_provided",
    rbq_expiry_date: p.rbq_expiry_date ?? null,
  });
  const app = getRbqApplicability({ specialty: p.specialty ?? null, services: p.services ?? [] });
  const regulated = app.status === "rbq_required";

  if (compliance.status === "verified" && p.rbq_number) {
    return { kind: "verified", marker: "VERIFIED", title: "Licence RBQ vérifiée", detail: "Votre licence est vérifiée et active.", isNextAction: false, regulatedEligible: true };
  }
  if (compliance.status === "expired") {
    return { kind: "blocked", marker: "VERIFIED", title: "Licence RBQ expirée ou invalide", detail: "Aucun mandat de travaux réglementés tant que la licence n'est pas valide. Mettez votre situation à jour.", isNextAction: true, regulatedEligible: false };
  }
  switch (p.rbq_declaration) {
    case "has_license":
      if (p.rbq_number) return { kind: "in_progress", marker: "PENDING", title: "Licence RBQ en vérification", detail: "UNPRO vérifie votre numéro auprès du registre officiel. Vous pouvez compléter votre fiche.", isNextAction: regulated, regulatedEligible: false };
      break;
    case "not_required":
      return {
        kind: "declared_exempt", marker: "DECLARED",
        title: "Exemption déclarée — vérification de l'activité en cours",
        detail: regulated
          ? "Votre métier comprend habituellement des travaux réglementés. UNPRO examine vos travaux précis; aucun mandat réglementé avant cette vérification."
          : "UNPRO confirme que vos travaux précis ne relèvent pas d'activités réglementées.",
        isNextAction: regulated, regulatedEligible: false,
      };
    case "in_progress":
      return { kind: "in_progress", marker: "PENDING", title: "Licence en cours d'obtention", detail: "Complétez votre fiche. Aucun mandat de travaux réglementés avant une licence valide.", isNextAction: regulated, regulatedEligible: false };
    case "unsure":
      return { kind: "unsure", marker: "PENDING", title: "Vérifier si une licence est nécessaire", detail: "UNPRO examine vos travaux exacts. Vous serez avisé du résultat.", isNextAction: true, regulatedEligible: false };
    case "employer_licensed": {
      // Art. 46 B-1.1 : pas de prêt de licence; un sous-traitant doit avoir sa propre licence.
      // L'affiliation n'est jamais validée automatiquement (autorisation écrite + registre requis).
      const rel = p.rbq_declaration_details?.employer_relationship;
      if (rel === "independent") {
        return { kind: "independent_needs_own_licence", marker: "DECLARED", title: "Licence RBQ propre requise", detail: "Un sous-traitant indépendant doit détenir sa propre licence RBQ pour les travaux réglementés. La licence d'une autre entreprise ne peut pas être utilisée. Examen de conformité en cours.", isNextAction: true, regulatedEligible: false };
      }
      const name = p.rbq_declaration_details?.employer_legal_name?.trim();
      return { kind: "pending_employer_authorization", marker: "PENDING", title: "Autorisation de l'entreprise titulaire en attente", detail: `Votre lien avec ${name || "l'entreprise titulaire"} doit être confirmé par écrit par un responsable autorisé, et sa licence vérifiée. D'ici là, aucun mandat de travaux réglementés.`, isNextAction: true, regulatedEligible: false };
    }
    case "other":
      return { kind: "under_review", marker: "PENDING", title: "Situation RBQ en examen", detail: "UNPRO examine votre situation. Aucun mandat de travaux réglementés avant une licence RBQ valide et vérifiée.", isNextAction: true, regulatedEligible: false };
  }
  if (p.rbq_number?.trim()) {
    return { kind: "under_review", marker: "DECLARED", title: "Numéro RBQ déclaré — validité à confirmer", detail: "Un numéro est présent sur votre fiche. Confirmez votre situation ci-dessous; seule une vérification officielle peut confirmer sa validité.", isNextAction: true, regulatedEligible: false };
  }
  if (regulated) {
    return {
      kind: "needs_rbq", marker: "INFERRED", title: "Prochaine action : votre licence RBQ",
      detail: p.rbq_number
        ? "Votre licence RBQ est en cours de vérification par UNPRO. Vous pouvez compléter votre fiche pendant ce temps."
        : "Vos travaux déclarés exigent habituellement une licence RBQ. Indiquez votre situation : sans licence vérifiée, aucun mandat de travaux réglementés ne peut vous être confié.",
      isNextAction: true, regulatedEligible: false,
    };
  }
  if (app.status === "rbq_needs_clarification") {
    return { kind: "clarify", marker: "INFERRED", title: "Vérifions les travaux que vous offrez", detail: "Précisez vos travaux ou votre situation RBQ. Les travaux réglementés restent en attente d'une licence vérifiée.", isNextAction: true, regulatedEligible: false };
  }
  return { kind: "not_required_inferred", marker: "INFERRED", title: "Aucune licence RBQ requise selon vos activités déclarées", detail: "Estimation selon vos activités; UNPRO peut la revoir.", isNextAction: false, regulatedEligible: false };
}
