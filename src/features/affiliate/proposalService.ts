import { supabase } from "@/integrations/supabase/client";
import type { PricingIntakeInput } from "@/services/contractorPricingQuoteService";

export type ProposalKind = "activation_350" | "personnalise";
export interface AffiliateProposal {
  id: string;
  prospect_id: string;
  offer_type: ProposalKind;
  token: string;
  ref: string;
  company_name: string;
  inputs: Partial<PricingIntakeInput>;
  expires_at: string;
}
export function validateProposalInputs(kind: ProposalKind, input: Partial<PricingIntakeInput>) {
  if (kind === "activation_350") return;
  if (!input.trade_primary?.trim() || !input.city?.trim()) throw new Error("Confirmez le métier et le territoire.");
  for (const [key, min, max] of [["target_monthly_appointments", 1, 1000], ["monthly_capacity", 1, 1000], ["average_project_value", 1, 10000000], ["close_rate_estimate", 0.01, 1]] as const) {
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("Confirmez les objectifs, la capacité, le panier et le taux de conversion.");
  }
}
async function call(action: "get" | "save", prospectId: string, kind?: ProposalKind, inputs?: Partial<PricingIntakeInput>): Promise<AffiliateProposal | null> {
  if (kind) validateProposalInputs(kind, inputs ?? {});
  const { data, error } = await (supabase as any).rpc("affiliate_proposal_draft", {
    _action: action, _prospect_id: prospectId, _offer_type: kind ?? null, _inputs: inputs ?? {},
  });
  if (error) throw new Error("La proposition ne peut pas être sauvegardée ou relue. Réessayez; si le problème persiste, demandez la vérification de votre assignation.");
  if (action === "save" && !data?.id) throw new Error("La sauvegarde n'a pas été confirmée. Aucun lien client n'a été créé.");
  return data;
}
export const loadProposal = (id: string) => call("get", id);
export const saveProposal = (id: string, kind: ProposalKind, inputs: Partial<PricingIntakeInput>) => call("save", id, kind, inputs);
export function proposalClientLink(p: AffiliateProposal, origin: string) {
  const url = new URL(p.offer_type === "activation_350" ? "/entrepreneurs/activation-350" : "/entrepreneur/devis-personnalise", origin);
  url.searchParams.set("proposal", p.token);
  if (p.offer_type === "activation_350") url.searchParams.set("activate", "1");
  return url.toString();
}
export async function resolveProposal(token: string): Promise<AffiliateProposal> {
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error("Lien de proposition invalide.");
  const { data, error } = await (supabase as any).rpc("resolve_affiliate_proposal_context", { _token: token });
  if (error || !data?.id) throw new Error("Cette proposition est indisponible ou expirée. Demandez un nouveau lien à votre contact UNPRO.");
  return data;
}