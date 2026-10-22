/**
 * Mode Action : réutilise la feuille d'ajout riche (brouillon serveur, aucune réservation).
 * L'ancien formulaire « Ajouter et appeler » insérait directement un prospect attribué (fail-open) : retiré.
 */
import { AddLeadSheet } from "@/features/affiliate/addLead/AddLeadSheet";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  affiliateId: string;
  onCreated: () => void;
}

export default function AddProspectSheet({ open, onOpenChange, affiliateId, onCreated }: Props) {
  return (
    <AddLeadSheet
      open={open}
      affiliateId={affiliateId}
      onOpenChange={(v) => { onOpenChange(v); if (!v) onCreated(); }}
    />
  );
}
