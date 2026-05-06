import type { PartnerRole } from "./partnerTerms";

export type PartnerFeature =
  | "links" | "commissions" | "referrals"
  | "crm" | "leads" | "pipeline" | "reminders" | "notes"
  | "bulkExport" | "automation" | "onboarding" | "territory";

const NONE: Record<PartnerFeature, boolean> = {
  links: false, commissions: false, referrals: false,
  crm: false, leads: false, pipeline: false, reminders: false, notes: false,
  bulkExport: false, automation: false, onboarding: false, territory: false,
};

const ALL: Record<PartnerFeature, boolean> = Object.fromEntries(
  Object.keys(NONE).map(k => [k, true])
) as Record<PartnerFeature, boolean>;

export const PARTNER_PERMISSIONS: Record<PartnerRole, Record<PartnerFeature, boolean>> = {
  affiliate: { ...NONE, links: true, commissions: true, referrals: true },
  ambassador: { ...NONE, links: true, commissions: true, referrals: true,
    crm: true, leads: true, pipeline: true, reminders: true, notes: true },
  certified_partner: { ...ALL },
  territory_partner: { ...ALL },
  partner_admin: { ...ALL },
};

export function partnerCan(role: string | null | undefined, feature: PartnerFeature): boolean {
  if (!role) return false;
  const perms = PARTNER_PERMISSIONS[role as PartnerRole];
  return !!perms?.[feature];
}
