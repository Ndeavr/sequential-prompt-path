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
import { trackFunnelStep } from "@/lib/analytics/funnelSteps";

const KEEP = ["ref", "promo", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "source"];

export function buildCreditCampaignHref(params: URLSearchParams): string {
  const out = new URLSearchParams({ campaign: "credit_1000", offer: "credit_1000", from: "credit_promotionnel" });
  for (const k of KEEP) {
    const v = params.get(k);
    if (v) out.set(k, v);
  }
  return `/entrepreneur/devis-personnalise?${out.toString()}`;
}

const STEPS = [
  { icon: Briefcase, title: "Métier et ville", text: "Votre domaine et votre territoire." },
  { icon: Target, title: "Objectifs", text: "Les rendez-vous que vous visez." },
  { icon: Sparkles, title: "Offre adaptée", text: "Un forfait calculé selon votre capacité réelle." },
];

export default function PageCreditPromotionnel() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    void trackFunnelStep("landing_viewed" as never, { metadata: { campaign: "credit_1000" } } as never);
  }, []);

  const start = () => {
    void trackFunnelStep("activation_cta_clicked" as never, { metadata: { campaign: "credit_1000" } } as never);
    navigate(buildCreditCampaignHref(params));
  };

  return (
    <main className="min-h-screen bg-background">
      <SeoHead
        title="1 000 $ de crédit promotionnel pour entrepreneurs | UNPRO"
        description="Découvrez si votre entreprise peut recevoir 1 000 $ de crédit promotionnel UNPRO avec un forfait admissible."
      />
      <section className="mx-auto w-full max-w-2xl px-5 pt-12 pb-10 space-y-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Pour les entrepreneurs</p>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
          Êtes-vous admissible à 1 000 $ de crédit promotionnel?
        </h1>
        <p className="text-lg text-muted-foreground">
          Vous cherchez plus de contrats? Découvrez si votre entreprise peut recevoir 1 000 $ de crédit promotionnel UNPRO avec un forfait admissible.
        </p>
        <div className="space-y-2">
          <Button size="lg" className="w-full md:w-auto min-h-[48px] text-base" onClick={start}>
            Vérifier mon admissibilité <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground">Avec un forfait de 1 000 $ ou plus. Conditions applicables.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-5 pb-10 grid gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-4">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-medium text-card-foreground">{i + 1}. {s.title}</p>
            <p className="text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-2xl px-5 pb-16 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Conditions</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Une seule entreprise admissible par domaine et par ville, attribuée seulement après paiement confirmé d'un forfait admissible de 1 000 $ CA ou plus.</li>
          <li>Le crédit est offert en services UNPRO supplémentaires. Ce n'est ni un rabais sur le paiement, ni de l'argent, ni une subvention, ni un budget publicitaire.</li>
          <li>Le forfait est recommandé selon votre métier et vos objectifs, jamais gonflé pour atteindre 1 000 $.</li>
          <li>L'activation de base à 350 $ reste offerte, sans crédit, et n'est jamais facturée deux fois.</li>
          <li>Admissibilité à confirmer par UNPRO avant toute attribution.</li>
        </ul>
      </section>
    </main>
  );
}
