import { readAttribution } from "@/config/contractorFunnel";

export function campaignLink(path: string, search: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(readAttribution(search));
  const original = new URLSearchParams(search);
  for (const key of ["promo", "audit", "audit_token", "objective", "from"]) {
    const value = original.get(key);
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}`;
}
export function creditCampaignHref(search: string) {
  // campaign is attribution, never a server-issued offer ID.
  return campaignLink("/entrepreneur/devis-personnalise", search, { campaign: "credit_1000", from: "credit_promotionnel" });
}
