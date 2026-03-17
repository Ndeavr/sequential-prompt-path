/**
 * UNPRO — Contractor Engine Hub Page
 * Main incoming projects page with decision engine, smart decline, subcontractor search.
 */

import { useState } from "react";
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState, EmptyState, PageHeader } from "@/components/shared";
import { useContractorLeads } from "@/hooks/useLeads";
import { useContractorProfile } from "@/hooks/useContractor";
import { useUpdateAppointmentStatus } from "@/hooks/useAppointments";
import { useHasActiveSubscription } from "@/hooks/useSubscription";
import {
  useContractorCapabilities, useContractorExclusions, useSmartDecline
} from "@/hooks/useContractorEngine";
import SubscriptionPaywall from "@/components/contractor/SubscriptionPaywall";
import IncomingProjectsList from "@/components/contractor/IncomingProjectsList";
import SmartDeclineModal from "@/components/contractor/SmartDeclineModal";
import { enrichIncomingProject } from "@/services/contractorEngine";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import type { IncomingProject } from "@/types/contractorEngine";

const ProIncomingProjects = () => {
  const { data: leads, isLoading: leadsLoading } = useContractorLeads();
  const { data: profile } = useContractorProfile();
  const { data: capabilities } = useContractorCapabilities();
  const { data: exclusions } = useContractorExclusions();
  const { hasActive, isLoading: subLoading } = useHasActiveSubscription();
  const updateStatus = useUpdateAppointmentStatus();
  const smartDecline = useSmartDecline();

  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineApptId, setDeclineApptId] = useState<string | undefined>();

  const isLoading = leadsLoading || subLoading;

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;
  if (!hasActive) return <ContractorLayout><SubscriptionPaywall /></ContractorLayout>;

  // Enrich leads with scope coverage
  const projects: IncomingProject[] = (leads ?? []).map((lead: any) =>
    enrichIncomingProject(lead, capabilities ?? [], exclusions ?? [], profile?.city)
  );

  const handleAccept = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project?.appointment_id) {
      try {
        await updateStatus.mutateAsync({ id: project.appointment_id, status: "accepted" });
        toast.success("Rendez-vous accepté !");
      } catch { toast.error("Erreur lors de l'acceptation."); }
    }
  };

  const handleDecline = (id: string) => {
    const project = projects.find(p => p.id === id);
    setDeclineId(id);
    setDeclineApptId(project?.appointment_id);
  };

  const confirmDecline = async (payload: { decline_type: string; reason_code?: string; reason_text?: string }) => {
    if (!declineApptId) return;
    try {
      await smartDecline.mutateAsync({ appointment_id: declineApptId, ...payload });
      toast.success(
        payload.decline_type === "redirect"
          ? "Projet redirigé vers un autre entrepreneur."
          : payload.decline_type === "partner"
            ? "Recherche de partenaire lancée."
            : "Projet refusé."
      );
    } catch { toast.error("Erreur."); }
    setDeclineId(null);
    setDeclineApptId(undefined);
  };

  const handleFindSub = (id: string) => {
    toast.info("Recherche de sous-traitant — fonctionnalité en cours d'intégration");
  };

  const handleBuildTeam = (id: string) => {
    toast.info("Création d'équipe — fonctionnalité en cours d'intégration");
  };

  return (
    <ContractorLayout>
      <div className="dark max-w-3xl mx-auto space-y-5 pb-20">
        <PageHeader
          title="Projets entrants"
          description="Vos rendez-vous exclusifs classés par pertinence"
        />

        <IncomingProjectsList
          projects={projects}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onFindSub={handleFindSub}
          onBuildTeam={handleBuildTeam}
        />

        <AnimatePresence>
          {declineId && (
            <SmartDeclineModal
              projectId={declineId}
              appointmentId={declineApptId}
              onConfirm={confirmDecline}
              onClose={() => { setDeclineId(null); setDeclineApptId(undefined); }}
            />
          )}
        </AnimatePresence>
      </div>
    </ContractorLayout>
  );
};

export default ProIncomingProjects;
