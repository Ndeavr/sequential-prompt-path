/**
 * Affichage de la Présence IA annuelle sur le plan personnalisé.
 * La décision vient du serveur (`my_annual_presence_decision`); le paiement
 * la recalcule. Taxes calculées par ligne, comme Stripe (TPS 5 %, TVQ 9,975 %).
 */
import { quebecTaxes } from "@/lib/pricing/planGoalModel";

export const ANNUAL_PRESENCE_CENTS = 35000;

export type PresenceDecisionView =
  | { state: "unknown" }
  | { state: "required"; expired: boolean }
  | { state: "covered"; reason: "valid_annual_presence" | "historical_subscription" | "historical_activation"; validUntil: string | null };

export function readPresenceDecision(rpc: unknown): PresenceDecisionView {
  const r = rpc as { required?: unknown; reason?: unknown; valid_until?: unknown } | null | undefined;
  if (!r || typeof r.required !== "boolean" || typeof r.reason !== "string") return { state: "unknown" };
  // Droit antérieur en revue : rien n'est présumé dû ni payé à l'affichage.
  if ((r as { blocked?: unknown }).blocked === true) return { state: "unknown" };
  if (r.required) return { state: "required", expired: r.reason === "annual_presence_expired" };
  if (r.reason === "valid_annual_presence" || r.reason === "historical_subscription" || r.reason === "historical_activation") {
    return { state: "covered", reason: r.reason, validUntil: typeof r.valid_until === "string" ? r.valid_until : null };
  }
  return { state: "unknown" };
}

const dateFr = (iso: string) => new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Toronto", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export function annualPresenceLines(planCents: number, d: PresenceDecisionView) {
  const includePresence = d.state === "required";
  const plan = quebecTaxes(planCents);
  const pres = includePresence ? quebecTaxes(ANNUAL_PRESENCE_CENTS) : { gst: 0, qst: 0, total: 0 };
  const today = { gst: plan.gst + pres.gst, qst: plan.qst + pres.qst, total: plan.total + pres.total };
  const note =
    d.state === "required"
      ? `${d.expired ? "Votre Présence IA est expirée : elle" : "La Présence IA (350 $ + taxes par année)"} est ajoutée une seule fois à ce paiement. Renouvellement manuel dans 12 mois, jamais automatique.`
      : d.state === "covered"
        ? d.reason === "valid_annual_presence" && d.validUntil
          ? `Présence IA déjà valide jusqu'au ${dateFr(d.validUntil)} : non facturée de nouveau.`
          : "Vos droits actuels couvrent la Présence IA : non facturée de nouveau."
        : "Si votre Présence IA (350 $ + taxes par année) n'est pas déjà valide, elle est ajoutée une seule fois à ce paiement; UNPRO le vérifie avant le paiement.";
  return { includePresence, today, note };
}
