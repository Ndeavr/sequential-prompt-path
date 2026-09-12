/**
 * Source unique de vérité pour la recommandation réellement persistée.
 *
 * Règles :
 *  - la demande doit appartenir au propriétaire authentifié ;
 *  - le jumelage doit exister réellement dans `matches` (clé `lead_id`) ;
 *  - l'entrepreneur doit franchir toutes les barrières dures, y compris une
 *    licence RBQ vérifiée, datée et non expirée ;
 *  - un nom d'entreprise réel et une adresse publique (slug) sont exigés,
 *    sinon aucune réservation n'est possible ;
 *  - aucun score interne n'est exposé.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface EligibleRecommendation {
  contractorId: string;
  slug: string;
  name: string;
  city: string | null;
  reason: string | null;
}

export function isEligibleContractor(pro: Record<string, unknown>): boolean {
  const rbqValid =
    typeof pro.rbq_number === "string" &&
    pro.rbq_number.trim().length > 0 &&
    pro.rbq_compliance_status === "verified" &&
    !!pro.rbq_verified_at &&
    (!pro.rbq_expiry_date ||
      new Date(String(pro.rbq_expiry_date)).getTime() > Date.now());

  const hasIdentity =
    typeof pro.business_name === "string" &&
    pro.business_name.trim().length > 0 &&
    typeof pro.slug === "string" &&
    pro.slug.trim().length > 0;

  return (
    hasIdentity &&
    pro.account_status === "active" &&
    pro.verification_status === "verified" &&
    pro.is_accepting_appointments === true &&
    pro.booking_enabled === true &&
    rbqValid
  );
}

export async function fetchEligibleRecommendation(
  userId: string,
  leadId: string,
  projectId: string,
): Promise<EligibleRecommendation | null> {
  // 1. Demande appartenant réellement au propriétaire authentifié.
  let resolvedLeadId = leadId;
  if (!resolvedLeadId) {
    if (!projectId) return null;
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("owner_profile_id", userId)
      .eq("payload->>project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lead?.id) return null;
    resolvedLeadId = lead.id as string;
  } else {
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", resolvedLeadId)
      .eq("owner_profile_id", userId)
      .maybeSingle();
    if (!lead?.id) return null;
  }

  // 2. Jumelage principal réellement persisté pour cette demande.
  //    Aucun tri par score, aucun repli sur une suggestion.
  const { data: match, error } = await supabase
    .from("matches")
    .select("contractor_id, reasons, status, response_status")
    .eq("lead_id", resolvedLeadId)
    .eq("status", "primary")
    .maybeSingle();
  if (error || !match?.contractor_id) return null;

  const responseStatus = String(
    (match as { response_status?: unknown }).response_status ?? "",
  ).toLowerCase();
  if (REFUSED_RESPONSE_STATES.has(responseStatus)) return null;

  const { data: pro } = await supabase
    .from("contractors")
    .select(
      "id, slug, business_name, city, account_status, verification_status, is_accepting_appointments, booking_enabled, rbq_number, rbq_compliance_status, rbq_verified_at, rbq_expiry_date",
    )
    .eq("id", match.contractor_id)
    .maybeSingle();
  if (!pro || !isEligibleContractor(pro as unknown as Record<string, unknown>)) return null;

  const reasons = match.reasons as unknown;
  const reason = Array.isArray(reasons)
    ? String(reasons[0] ?? "") || null
    : typeof reasons === "string"
      ? reasons
      : null;

  return {
    contractorId: String(pro.id),
    slug: String(pro.slug),
    name: String(pro.business_name),
    city: (pro.city as string) ?? null,
    reason,
  };
}


export function useEligibleRecommendation(
  userId: string | undefined,
  leadParam: string,
  projectParam: string,
) {
  const leadId = UUID_RE.test(leadParam) ? leadParam : "";
  const projectId = UUID_RE.test(projectParam) ? projectParam : "";
  const hasContext = !!(leadId || projectId);

  const query = useQuery({
    queryKey: ["eligible-recommendation", userId, leadId, projectId],
    enabled: !!userId && hasContext,
    queryFn: () => fetchEligibleRecommendation(userId!, leadId, projectId),
  });

  return { ...query, leadId, projectId, hasContext };
}
