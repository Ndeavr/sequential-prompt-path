import { useSearchParams } from "react-router-dom";
export default function CreditCampaignNotice() {
  const [params] = useSearchParams();
  if (params.get("campaign") !== "credit_1000") return null;
  return <aside className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm" role="note"><p className="font-semibold">Crédit promotionnel de 1 000 $ · Admissibilité à confirmer</p><p className="mt-2 opacity-80">Un forfait de 1 000 $ ou plus ne suffit pas à confirmer le crédit. Faites confirmer par UNPRO la disponibilité dans votre domaine et votre ville ainsi que les services couverts avant de payer. Le paiement du forfait standard ne garantit pas ce crédit.</p></aside>;
}
