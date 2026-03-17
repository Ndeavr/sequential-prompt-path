/**
 * UNPRO — Expertise Control Page
 */

import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState, PageHeader } from "@/components/shared";
import {
  useContractorCapabilities, useContractorExclusions,
  useUpsertCapability, useDeleteCapability,
  useAddExclusion, useDeleteExclusion,
  useExecutionModel, useUpsertExecutionModel
} from "@/hooks/useContractorEngine";
import ExpertiseControlPanel from "@/components/contractor/ExpertiseControlPanel";
import { generateExpertisePreview } from "@/services/contractorEngine";
import { toast } from "sonner";

const ProExpertise = () => {
  const { data: capabilities, isLoading: capLoad } = useContractorCapabilities();
  const { data: exclusions, isLoading: exclLoad } = useContractorExclusions();
  const { data: execModel, isLoading: execLoad } = useExecutionModel();
  const addCap = useUpsertCapability();
  const delCap = useDeleteCapability();
  const addExcl = useAddExclusion();
  const delExcl = useDeleteExclusion();
  const updateExec = useUpsertExecutionModel();

  const isLoading = capLoad || exclLoad || execLoad;
  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const preview = generateExpertisePreview(capabilities ?? [], exclusions ?? []);

  return (
    <ContractorLayout>
      <div className="dark max-w-3xl mx-auto space-y-5 pb-20">
        <PageHeader title="Mon champ d'expertise" description="Définissez vos compétences et exclusions pour recevoir les bons projets" />
        <ExpertiseControlPanel
          capabilities={capabilities ?? []}
          exclusions={exclusions ?? []}
          preview={preview}
          onAddCapability={async cap => { try { await addCap.mutateAsync(cap); toast.success("Compétence ajoutée"); } catch { toast.error("Erreur"); } }}
          onRemoveCapability={async id => { try { await delCap.mutateAsync(id); toast.success("Supprimée"); } catch { toast.error("Erreur"); } }}
          onAddExclusion={async excl => { try { await addExcl.mutateAsync(excl); toast.success("Exclusion ajoutée"); } catch { toast.error("Erreur"); } }}
          onRemoveExclusion={async id => { try { await delExcl.mutateAsync(id); toast.success("Supprimée"); } catch { toast.error("Erreur"); } }}
          executionModel={execModel ? {
            execution_mode: execModel.execution_mode,
            works_as_subcontractor: execModel.works_as_subcontractor,
            accepts_subcontractors: execModel.accepts_subcontractors,
            max_distance_km: execModel.max_distance_km,
          } : { execution_mode: "direct", works_as_subcontractor: false, accepts_subcontractors: false, max_distance_km: 50 }}
          onUpdateExecution={async model => { try { await updateExec.mutateAsync(model); toast.success("Mis à jour"); } catch { toast.error("Erreur"); } }}
        />
      </div>
    </ContractorLayout>
  );
};

export default ProExpertise;
