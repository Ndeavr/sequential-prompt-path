/**
 * UNPRO — Partner Network Page
 */

import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState, PageHeader } from "@/components/shared";
import { usePartnerNetwork, useUpdateRelationship } from "@/hooks/useContractorEngine";
import PartnerNetworkPanel from "@/components/contractor/PartnerNetworkPanel";
import { toast } from "sonner";

const ProPartnerNetwork = () => {
  const { data: partners, isLoading } = usePartnerNetwork();
  const updateRelationship = useUpdateRelationship();

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await updateRelationship.mutateAsync({ id, is_favorite: !current });
      toast.success(!current ? "Ajouté aux favoris" : "Retiré des favoris");
    } catch { toast.error("Erreur"); }
  };

  const handleToggleBlock = async (id: string, current: boolean) => {
    try {
      await updateRelationship.mutateAsync({ id, is_blocked: !current });
      toast.success(!current ? "Partenaire bloqué" : "Partenaire débloqué");
    } catch { toast.error("Erreur"); }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await updateRelationship.mutateAsync({ id, private_notes: notes });
    } catch { toast.error("Erreur"); }
  };

  return (
    <ContractorLayout>
      <div className="dark max-w-3xl mx-auto space-y-5 pb-20">
        <PageHeader title="Réseau de partenaires" description="Gérez vos partenaires de confiance, favoris et contacts bloqués" />
        <PartnerNetworkPanel
          partners={partners ?? []}
          onToggleFavorite={handleToggleFavorite}
          onToggleBlock={handleToggleBlock}
          onUpdateNotes={handleUpdateNotes}
        />
      </div>
    </ContractorLayout>
  );
};

export default ProPartnerNetwork;
