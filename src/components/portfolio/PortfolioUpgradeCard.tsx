/**
 * Offre secondaire, facultative, après une soumission gratuite réelle.
 * Branchée à la page d'activation 350 $ existante (checkout + webhook signé
 * existants). Ne montre jamais un compte payé : seul le webhook confirme.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

export const ACTIVATION_PATH = "/entrepreneurs/activation-350";

export default function PortfolioUpgradeCard({ fr, contractorId, onContinueFree }: { fr: boolean; contractorId: string | null; onContinueFree: () => void }) {
  const L = (f: string, e: string) => (fr ? f : e);
  useEffect(() => {
    void logFunnelEvent({
      event_type: "upgrade_viewed", step: "free_portfolio", contractor_id: contractorId,
      metadata: { offer: "entry_activation_350", is_sale: false },
      dedupe_key: `upgrade_viewed:portfolio:${contractorId ?? "none"}`,
    });
  }, [contractorId]);

  return (
    <section className="rounded-[28px] border border-border bg-card p-5" aria-labelledby="upgrade-title">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />{L("Facultatif", "Optional")}</p>
      <h2 id="upgrade-title" className="mt-2 text-lg font-semibold text-foreground">{L("Allez plus loin : présence IA UNPRO — 350 $ + taxes", "Go further: UNPRO AI presence — $350 + taxes")}</h2>
      <ul className="mt-3 space-y-1.5 text-sm text-foreground">
        <li>{L("• Profil professionnel complet sur UNPRO", "• Complete professional profile on UNPRO")}</li>
        <li>{L("• 12 mois de présence IA UNPRO", "• 12 months of UNPRO AI presence")}</li>
        <li>{L("• Paiement unique de 350 $ + taxes (402,41 $ avec TPS et TVQ), sans renouvellement automatique", "• One-time $350 + taxes ($402.41 with GST and QST), no automatic renewal")}</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">{L("Aucun rendez-vous n’est inclus par défaut. Un forfait de rendez-vous exclusifs peut être proposé séparément, avec son prix et ses conditions avant tout achat.", "No appointments are included by default. An exclusive appointment plan can be offered separately, with its price and terms before any purchase.")}</p>
      <div className="mt-4 flex flex-col gap-2">
        <Button asChild className="min-h-12 whitespace-normal">
          <Link
            to={ACTIVATION_PATH}
            onClick={() => void logFunnelEvent({
              event_type: "checkout_started", step: "free_portfolio", contractor_id: contractorId,
              metadata: { offer: "entry_activation_350", stage: "activation_page_opened", is_sale: false },
              dedupe_key: `checkout_started:portfolio:${contractorId ?? "none"}`,
            })}
          >
            {L("Découvrir l’activation à 350 $", "Explore the $350 activation")}
          </Link>
        </Button>
        <Button type="button" variant="ghost" className="min-h-11 whitespace-normal" onClick={onContinueFree}>{L("Continuer gratuitement", "Continue for free")}</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{L("Vos projets gratuits restent en modération et publiables sans payer.", "Your free projects stay in review and publishable without paying.")}</p>
    </section>
  );
}
