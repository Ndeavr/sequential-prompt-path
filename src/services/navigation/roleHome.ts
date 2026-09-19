/**
 * UNPRO — Role home destinations (single source of truth for role switching).
 * Used by the profile menu and the mobile drawer so every role lands on its
 * real space — never on the homeowner dashboard by default.
 */
export function roleHomePath(role: string): string {
  switch (role) {
    case "admin": return "/admin";
    case "contractor": return "/pro";
    case "partner": return "/partenaire/dashboard";
    case "affiliate": return "/affiliate";
    case "homeowner":
    default: return "/dashboard";
  }
}

export const ROLE_LABELS: Record<string, { fr: string; en: string }> = {
  homeowner: { fr: "Propriétaire", en: "Homeowner" },
  contractor: { fr: "Entrepreneur", en: "Contractor" },
  partner: { fr: "Partenaire", en: "Partner" },
  affiliate: { fr: "Affilié", en: "Affiliate" },
  admin: { fr: "Administrateur", en: "Admin" },
};
