/**
 * UNPRO — RBQ Compliance Status
 * Single source of truth for RBQ status labels, explanations, and
 * recommendation-engine effects.
 */

export type RbqStatus = "verified" | "in_progress" | "not_provided" | "expired";

export interface RbqBadgeDef {
  status: RbqStatus;
  labelFr: string;
  labelEn: string;
  tone: "success" | "warning" | "muted" | "destructive";
  /** Tailwind classes leveraging design tokens. */
  className: string;
  explanationFr: string;
  explanationEn: string;
}

export const RBQ_BADGES: Record<RbqStatus, RbqBadgeDef> = {
  verified: {
    status: "verified",
    labelFr: "RBQ Vérifiée",
    labelEn: "RBQ Verified",
    tone: "success",
    className:
      "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
    explanationFr:
      "Licence RBQ vérifiée et active. L'entrepreneur est admissible à toutes les recommandations.",
    explanationEn:
      "RBQ license verified and active. Contractor is eligible for all recommendations.",
  },
  in_progress: {
    status: "in_progress",
    labelFr: "RBQ en cours d'obtention",
    labelEn: "RBQ In Progress",
    tone: "warning",
    className:
      "bg-amber-500/15 text-amber-500 border-amber-500/40",
    explanationFr:
      "Démarche RBQ en cours. Éligible aux catégories sans exigence de licence obligatoire ou en attente de validation.",
    explanationEn:
      "RBQ application in progress. Eligible for categories where a license is not yet required or is pending validation.",
  },
  not_provided: {
    status: "not_provided",
    labelFr: "Licence RBQ non fournie",
    labelEn: "RBQ Not Provided",
    tone: "muted",
    className:
      "bg-muted text-muted-foreground border-border",
    explanationFr:
      "Aucune licence RBQ fournie. Visibilité réduite et badge de conformité indisponible.",
    explanationEn:
      "No RBQ license provided. Reduced visibility and compliance badge unavailable.",
  },
  expired: {
    status: "expired",
    labelFr: "Licence RBQ expirée ou invalide",
    labelEn: "RBQ Expired or Invalid",
    tone: "destructive",
    className:
      "bg-red-500/15 text-red-500 border-red-500/40",
    explanationFr:
      "Licence RBQ expirée ou invalide. Recommandations suspendues jusqu'à correction.",
    explanationEn:
      "RBQ license expired or invalid. Recommendations are suspended until corrected.",
  },
};

/**
 * Categories where a valid RBQ is legally mandatory in Québec.
 * Contractors with `in_progress` / `not_provided` are excluded from these
 * unless upgraded to `verified`.
 */
export const RBQ_REQUIRED_CATEGORIES = new Set<string>([
  "roofing",
  "foundation",
  "electrical",
  "plumbing",
  "hvac",
  "structural",
  "excavation",
  "waterproofing",
  "gas",
]);

export interface RbqCompliance {
  status: RbqStatus;
  badge: RbqBadgeDef;
  /** true = contractor may be recommended at all (subject to category). */
  eligible: boolean;
  /** Multiplier applied to visibility / recommendation score. */
  visibilityMultiplier: number;
  /** True only when a compliance badge should render publicly. */
  showComplianceBadge: boolean;
}

/**
 * Compute compliance state for a contractor row.
 * Category-aware eligibility should be checked via `isEligibleForCategory`.
 */
export function getRbqCompliance(
  contractor: Pick<
    { rbq_compliance_status?: RbqStatus | null; rbq_expiry_date?: string | null },
    "rbq_compliance_status" | "rbq_expiry_date"
  >,
): RbqCompliance {
  let status: RbqStatus = (contractor.rbq_compliance_status ?? "not_provided") as RbqStatus;

  // Runtime safety net: if the DB still says verified but expiry passed, treat as expired.
  if (
    status === "verified" &&
    contractor.rbq_expiry_date &&
    new Date(contractor.rbq_expiry_date).getTime() < Date.now()
  ) {
    status = "expired";
  }

  switch (status) {
    case "verified":
      return {
        status,
        badge: RBQ_BADGES.verified,
        eligible: true,
        visibilityMultiplier: 1.0,
        showComplianceBadge: true,
      };
    case "in_progress":
      return {
        status,
        badge: RBQ_BADGES.in_progress,
        eligible: true,
        visibilityMultiplier: 0.85,
        showComplianceBadge: false,
      };
    case "not_provided":
      return {
        status,
        badge: RBQ_BADGES.not_provided,
        eligible: true,
        visibilityMultiplier: 0.6,
        showComplianceBadge: false,
      };
    case "expired":
      return {
        status,
        badge: RBQ_BADGES.expired,
        eligible: false,
        visibilityMultiplier: 0,
        showComplianceBadge: false,
      };
  }
}

/**
 * Category-aware eligibility check for the recommendation engine.
 * @param category service category slug (e.g. "roofing")
 */
export function isEligibleForCategory(
  contractor: Pick<
    { rbq_compliance_status?: RbqStatus | null; rbq_expiry_date?: string | null },
    "rbq_compliance_status" | "rbq_expiry_date"
  >,
  category?: string | null,
): boolean {
  const c = getRbqCompliance(contractor);
  if (!c.eligible) return false; // expired => hard exclude
  if (!category) return true;
  const rbqRequired = RBQ_REQUIRED_CATEGORIES.has(category.toLowerCase());
  if (!rbqRequired) return true;
  return c.status === "verified";
}
