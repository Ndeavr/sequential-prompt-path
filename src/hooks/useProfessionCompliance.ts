/**
 * useProfessionCompliance — thin read hook over the server compliance layer.
 * The UI never decides; it only reflects the server verdict (fail-closed).
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchComplianceRule,
  fetchComplianceRules,
  fetchProfessionalCredentials,
  type ProfessionComplianceRule,
  type ProfessionalCredential,
} from "@/lib/compliance/professionCompliance";

export function useComplianceRules() {
  return useQuery<ProfessionComplianceRule[]>({
    queryKey: ["compliance-rules"],
    queryFn: fetchComplianceRules,
    staleTime: 60_000,
  });
}

export function useComplianceRule(professionCode?: string | null) {
  return useQuery<ProfessionComplianceRule | null>({
    queryKey: ["compliance-rule", professionCode],
    queryFn: () => fetchComplianceRule(professionCode as string),
    enabled: !!professionCode,
    staleTime: 60_000,
  });
}

export function useProfessionalCredentials(contractorId?: string | null) {
  return useQuery<ProfessionalCredential[]>({
    queryKey: ["professional-credentials", contractorId],
    queryFn: () => fetchProfessionalCredentials(contractorId as string),
    enabled: !!contractorId,
    staleTime: 30_000,
  });
}
