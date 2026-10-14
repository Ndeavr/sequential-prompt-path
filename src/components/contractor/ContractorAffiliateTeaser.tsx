import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Handshake } from "lucide-react";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

export default function ContractorAffiliateTeaser() {
  const { search } = useLocation();
  return (
    <aside className="my-6 rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] p-5" aria-label="Programme affilié pour entrepreneurs">
      <div className="flex items-start gap-3">
        <Handshake className="mt-1 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Comment votre forfait pourrait vous revenir à 0 $ par mois?</h2>
          <p className="mt-1 text-sm opacity-80">Vos références peuvent générer des commissions qui couvrent vos frais — et même les dépassent.</p>
          <Link className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500" to={campaignLink("/entrepreneurs/affiliation", search)} onClick={() => void logFunnelEvent({ event_type: "cta_click", metadata: { campaign: "contractor_affiliation", placement: window.location.pathname } })}>
            Par ici les p’tits vites <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="text-xs opacity-65">Selon vos commissions admissibles. Revenus non garantis; forfait facturé normalement.</p>
        </div>
      </div>
    </aside>
  );
}
