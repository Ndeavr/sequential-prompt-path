/**
 * UNPRO — Team Builder Page
 */

import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState, PageHeader } from "@/components/shared";
import { useProjectTeams, useCreateTeam } from "@/hooks/useContractorEngine";
import TeamBuilderPanel from "@/components/contractor/TeamBuilderPanel";
import { toast } from "sonner";

const ProTeams = () => {
  const { data: teams, isLoading } = useProjectTeams();
  const createTeam = useCreateTeam();

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const handleCreate = async (name: string) => {
    try {
      await createTeam.mutateAsync({ team_name: name });
      toast.success("Équipe créée !");
    } catch { toast.error("Erreur"); }
  };

  return (
    <ContractorLayout>
      <div className="dark max-w-3xl mx-auto space-y-5 pb-20">
        <PageHeader title="Équipes projet" description="Créez et gérez vos équipes pour les projets multi-spécialités" />
        <TeamBuilderPanel teams={teams ?? []} onCreateTeam={handleCreate} />
      </div>
    </ContractorLayout>
  );
};

export default ProTeams;
