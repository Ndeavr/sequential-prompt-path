import { invokeMatchingProfile } from "@/lib/matching/invokeMatchingProfile";
import { getMatchingSessionKey } from "@/lib/matching/sessionKey";
import type { ClaraContractorQualification } from "./claraContractorQualification";

/** Matching data belongs to the existing matching profile, never workflow metadata. */
export function qualificationMatchingAnswers(value: ClaraContractorQualification): Record<string, unknown> {
  const answers: Record<string, unknown> = { clara_qualification: value };
  if (value.preferred_work !== undefined) answers.services_wanted = value.preferred_work;
  if (value.excluded_work !== undefined) answers.services_refused = value.excluded_work;
  if (value.service_areas !== undefined) answers.territories = value.service_areas.filter(area => !value.excluded_areas?.some(excluded => excluded.toLocaleLowerCase("fr-CA") === area.toLocaleLowerCase("fr-CA")));
  if (value.excluded_areas !== undefined) answers.excluded_territories = value.excluded_areas;
  const clientType = value.customer_type?.toLocaleLowerCase("fr-CA");
  if (clientType && /les deux|both|résidentiel.*commercial|commercial.*résidentiel/.test(clientType)) answers.client_type = "both";
  else if (clientType === "résidentiel" || clientType === "residential") answers.client_type = "residential";
  else if (clientType === "commercial") answers.client_type = "commercial";
  // Qualitative sizes are retained, never silently converted into monetary ranges.
  return answers;
}
function auditContext() {
  try {
    const audit = JSON.parse(sessionStorage.getItem("unpro_audit_ia_result") || "null");
    return audit?.audit_id && audit?.token ? { audit_id: audit.audit_id, audit_token: audit.token } : {};
  } catch { return {}; }
}
export async function persistClaraQualification(value: ClaraContractorQualification): Promise<void> {
  const { data, error } = await invokeMatchingProfile({
    action: "save", session_key: getMatchingSessionKey(), ...auditContext(), answers: qualificationMatchingAnswers(value),
    business_name: value.business_name || undefined, city: value.business_city || undefined, trade: value.primary_trade || undefined,
  });
  if (data?.error === "authentication_required") throw error;
  if (error || data?.ok !== true) throw new Error("Le profil n’a pas pu être sauvegardé. Vos critères restent dans ce navigateur; réessayez.");
}
export async function loadClaraQualification(): Promise<ClaraContractorQualification | null> {
  const { data, error } = await invokeMatchingProfile({ action: "get", session_key: getMatchingSessionKey(), ...auditContext() });
  if (data?.error === "authentication_required") throw error;
  if (error || data?.ok !== true) throw new Error("La reprise du profil est indisponible.");
  const value = data.profile?.answers?.clara_qualification;
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
