/**
 * Campagne « 1 000 $ de crédit promotionnel » — landing seulement.
 * Le CTA ouvre le parcours entrepreneur canonique (/entrepreneur/devis-personnalise)
 * en conservant campagne, affilié et UTM. Aucune allocation côté client :
 * l'admissibilité reste « à confirmer » tant qu'aucune règle serveur n'existe.
 */
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Briefcase, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SeoHead from "@/seo/components/SeoHead";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { creditCampaignHref } from "@/lib/contractorCampaignLinks";
import ContractorAffiliateTeaser from "@/components/contractor/ContractorAffiliateTeaser";

const STEPS = [
  { icon: Briefcase, title: "Métier et ville", text: "Votre domaine et votre territoire." },
  { icon: Target, title: "Objectifs", text: "Les rendez-vous que vous visez." },
  { icon: Sparkles, title: "Offre adaptée", text: "Un forfait calculé selon votre capacité réelle." },
];

export default function PageCreditPromotionnel() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    void logFunnelEvent({ event_type: "landing_view", metadata: { campaign: "credit_1000" } });
  }, []);

  const start = () => {
    void logFunnelEvent({ event_type: "cta_click", metadata: { campaign: "credit_1000" } });
    navigate(creditCampaignHref(params.toString()));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-amber-500/10 text-foreground pb-24">
      <SeoHead
        title="1 000 $ de crédit promotionnel pour entrepreneurs | UNPRO"
        description="Découvrez si votre entreprise peut recevoir 1 000 $ de crédit promotionnel UNPRO avec un forfait admissible."
      />
      <section className="mx-auto w-full max-w-4xl px-5 pt-14 sm:pt-20 pb-10 space-y-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Pour les entrepreneurs</p>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground">
          Êtes-vous admissible à 1 000 $ de crédit promotionnel?
        </h1>
        <p className="text-lg text-muted-foreground">
          Vous cherchez plus de contrats? Découvrez si votre entreprise peut recevoir 1 000 $ de crédit promotionnel UNPRO avec un forfait admissible.
        </p>
        <div className="space-y-2">
          <Button size="lg" className="w-full md:w-auto min-h-[48px] h-auto whitespace-normal py-3 text-base" onClick={start}>
            Vérifier mon admissibilité <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground">Avec un forfait admissible de 1 000 $ CA ou plus. Conditions applicables.</p>
          <p className="text-sm text-muted-foreground">Admissibilité à confirmer : la disponibilité et les services couverts doivent être validés avant l’achat. Cette vérification ne réserve pas de place.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-10 grid gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-4">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-medium text-card-foreground">{i + 1}. {s.title}</p>
            <p className="text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-10">
        <div className="rounded-3xl border border-primary/20 bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Un coup de pouce pour vos prochains contrats.</h2>
          <p className="mt-3 text-muted-foreground">Par exemple, si votre forfait admissible coûte 1 500 $, vous payez 1 500 $. Si votre admissibilité est confirmée, vous recevez aussi 1 000 $ en services UNPRO supplémentaires, détaillés dans votre offre.</p>
          <Button size="lg" className="mt-5 h-auto min-h-12 whitespace-normal py-3" onClick={start}>Vérifier mon admissibilité <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></Button>
        </div>
        <ContractorAffiliateTeaser />
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-16 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Conditions</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>La première entreprise admissible de chaque domaine et de chaque ville peut recevoir le crédit, après vérification de la disponibilité et paiement confirmé du forfait admissible.</li>
          <li>Le crédit est offert en services UNPRO supplémentaires. Ce n'est ni un rabais sur le paiement, ni de l'argent, ni une subvention, ni un budget publicitaire.</li>
          <li>Le forfait est recommandé selon votre métier et vos objectifs, jamais gonflé pour atteindre 1 000 $.</li>
          <li>L’activation de base à 350 $ reste accessible; elle ne donne pas automatiquement droit au crédit.</li>
          <li>Les services UNPRO couverts et leur valeur doivent être identifiés dans votre offre avant paiement. Crédit non monnayable.</li>
        </ul>
      </section>
    </main>
  );
}
