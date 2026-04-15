/**
 * AIPP v2 — Audit Entry Page
 * User enters a domain and triggers AI visibility analysis.
 */
import HeroSectionAuditAIVisibility from "@/components/aipp-v2/HeroSectionAuditAIVisibility";
import { useAIPPv2Submit } from "@/hooks/useAIPPv2Audit";

export default function PageAuditAIPPv2() {
  const { submit, isSubmitting } = useAIPPv2Submit();

  return (
    <div className="min-h-screen bg-background">
      <HeroSectionAuditAIVisibility onSubmit={submit} isSubmitting={isSubmitting} />
    </div>
  );
}
