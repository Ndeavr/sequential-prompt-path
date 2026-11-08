/**
 * Trois indicateurs distincts, jamais fusionnés : profil complété, licence RBQ
 * vérifiée, calendrier connecté. Une déclaration n'est jamais une vérification.
 * La date d'inscription vient seulement de `contractors.unpro_registered_at`
 * (événement d'inscription réel); absente = non affichée.
 */
export type RbqIndicator = "verified" | "declared_pending" | "in_progress" | "expired" | "not_provided";

export function rbqIndicator(c: {
  rbq_compliance_status?: string | null;
  rbq_verified_at?: string | null;
  rbq_expiry_date?: string | null;
  rbq_number?: string | null;
  rbq_declaration?: string | null;
} | null | undefined, today: Date = new Date()): RbqIndicator {
  if (!c) return "not_provided";
  const expired = !!c.rbq_expiry_date && new Date(`${c.rbq_expiry_date}T23:59:59Z`) < today;
  if (c.rbq_compliance_status === "expired" || (c.rbq_compliance_status === "verified" && expired)) return "expired";
  if (c.rbq_compliance_status === "verified" && c.rbq_verified_at) return "verified";
  if (c.rbq_compliance_status === "in_progress") return "in_progress";
  if ((c.rbq_number ?? "").trim() || (c.rbq_declaration ?? "").trim()) return "declared_pending";
  return "not_provided";
}

export const RBQ_LABEL: Record<RbqIndicator, string> = {
  verified: "Licence RBQ vérifiée",
  declared_pending: "Licence RBQ déclarée — vérification à venir",
  in_progress: "Licence RBQ en vérification",
  expired: "Licence RBQ expirée",
  not_provided: "Licence RBQ non fournie",
};

/** « Inscrit sur UNPRO depuis le [date] » / “On UNPRO since [date]”, fuseau America/Toronto. Date inconnue = rien. */
export function registeredLabel(registeredAt: string | null | undefined, lang: "fr" | "en" = "fr"): string | null {
  if (!registeredAt || Number.isNaN(Date.parse(registeredAt))) return null;
  const d = new Date(registeredAt);
  return lang === "en"
    ? `On UNPRO since ${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", month: "long", day: "numeric", year: "numeric" }).format(d)}`
    : `Inscrit sur UNPRO depuis le ${new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Toronto", day: "numeric", month: "long", year: "numeric" }).format(d)}`;
}
