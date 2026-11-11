import { Link, useLocation } from "react-router-dom";
import { contractorProfileEntryPath } from "@/lib/contractorProfileEntry";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { FREE_PORTFOLIO_PATH } from "@/lib/portfolio/freePortfolio";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { buildCommissionClaraLink } from "@/lib/commissionPartnershipIntake";
import HeroV2 from "@/components/entrepreneur-landing/v2/HeroV2";
import SectionPainV2 from "@/components/entrepreneur-landing/v2/SectionPainV2";
import SectionSolutionV2 from "@/components/entrepreneur-landing/v2/SectionSolutionV2";
import SectionHowItWorksV2 from "@/components/entrepreneur-landing/v2/SectionHowItWorksV2";


const PageEntrepreneursLanding = () => {
  const { search } = useLocation();
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const trackCta = useCallback((ctaKey: string, section: string) => {
    supabase
      .from("entrepreneur_cta_events")
      .insert({
        visitor_id: crypto.randomUUID(),
        cta_key: ctaKey,
        page_section: section,
      })
      .then(() => {});
  }, []);

  return (
    <>
      <Helmet>
        <title>{fr ? "Les bons projets pour développer votre entreprise | UNPRO" : "Grow your business with the right projects | UNPRO"}</title>
        <meta
          name="description"
          content={fr ? "Rénovation, construction, entretien, services : présentez vos spécialités à UNPRO. Clara recherche une compatibilité entre les projets des propriétaires et votre entreprise." : "Renovation, construction, maintenance, services: introduce your specialties to UNPRO. Clara looks for a fit between homeowner projects and your business."}
        />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs" />
      </Helmet>

      <div className="alex-immersive min-h-screen bg-background text-foreground">
        <HeroV2 onTrackCta={trackCta} />
        <SectionHowItWorksV2 />
        <SectionSolutionV2 />
        <SectionPainV2 />
        <section className="mx-auto max-w-4xl px-5 py-10">
          <h2 className="text-2xl font-semibold">{fr ? "Ce que votre inscription vous apporte" : "What your registration provides"}</h2>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Votre profil entreprise UNPRO et 12 mois de Présence IA sur UNPRO. Vos services, spécialités et territoire sont présentés aux propriétaires dont le projet correspond, licence vérifiée lorsque requise." : "Your UNPRO business profile and 12 months of AI presence on UNPRO. Your services, specialties and service area are presented to homeowners whose project fits, with licences verified where required."}</p>
          <p className="mt-3 text-base font-semibold">{fr ? "350 $ + taxes, paiement unique pour 12 mois de présence sur UNPRO." : "$350 + applicable taxes, one-time payment for 12 months of presence on UNPRO."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Autre possibilité : partenariat à commission — sur entente personnalisée, convenue par écrit. Rien n’est payé en ligne pour cette formule." : "Another option: commission partnership — under a custom agreement, set in writing. Nothing is paid online for this option."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Vous voulez des rendez-vous? Ils s’ajoutent selon un devis distinct, avec prix et volume affichés avant le paiement." : "Want appointments? They are added through a separate quote, with price and volume shown before payment."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Professions réglementées : inscription et demande d’information sous examen. Aucune recommandation rémunérée avant autorisation et vérification appropriées." : "Regulated professions: registration and information requests subject to review. No paid recommendation before appropriate authorization and verification."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="h-auto min-h-12 whitespace-normal"><Link to={contractorProfileEntryPath(search, lang)}>{fr ? "Préparer mon profil UNPRO" : "Prepare my UNPRO profile"}</Link></Button>
            <Button asChild variant="outline" className="h-auto min-h-12 whitespace-normal"><Link to={FREE_PORTFOLIO_PATH} onClick={() => trackCta("free_portfolio", "registration")}>{fr ? "Publiez vos réalisations gratuitement" : "Publish your projects for free"}</Link></Button>

          </div>
        </section>
        <section className="mx-auto max-w-4xl px-5 pb-10" aria-labelledby="commission-faq">
          <h2 id="commission-faq" className="text-2xl font-semibold">{fr ? "Questions fréquentes" : "Frequently asked questions"}</h2>
          <details className="mt-4 rounded-2xl border border-border bg-card px-5 py-4">
            <summary className="cursor-pointer text-base font-semibold">{fr ? "Est-ce qu’UNPRO fonctionne aussi à commission?" : "Does UNPRO also work on commission?"}</summary>
            <p className="mt-3 text-base text-muted-foreground">{fr ? "Oui. UNPRO peut fonctionner à 100 % à commission selon une entente personnalisée. Le taux fixe ou variable, le territoire, l’exclusivité éventuelle et les modalités sont convenus par écrit avant tout engagement. Prenez rendez-vous pour discuter de la formule adaptée à votre entreprise." : "Yes. UNPRO can work on a 100% commission basis under a custom agreement. The fixed or variable rate, the territory, any exclusivity and the terms are agreed in writing before any commitment. Book an appointment to discuss the right formula for your business."}</p>
            <Button asChild variant="outline" className="mt-4 h-auto min-h-12 whitespace-normal"><Link to={buildCommissionClaraLink(fr)} onClick={() => trackCta("commission_partnership", "faq")}>{fr ? "Prendre rendez-vous pour en discuter" : "Book an appointment to discuss it"}</Link></Button>
          </details>
        </section>
        <section className="mx-auto max-w-4xl px-5 pb-10">
          <h2 className="text-2xl font-semibold">{fr ? "100 millions $ : notre objectif d’économies partagées" : "$100 million: our shared savings objective"}</h2>
          <p className="mt-3 text-muted-foreground">{fr ? "Moins de soumissions et de déplacements pour rien. Plus de temps pour les bons mandats. Des coûts réduits dont les propriétaires peuvent aussi profiter. Voilà la vision qui nous rassemble." : "Fewer wasted quotes and trips. More time for the right jobs. Lower costs that homeowners can benefit from too. That is our shared vision."}</p>
          <Link to={fr ? "/vision" : "/en/vision"} className="mt-4 inline-block font-semibold text-primary underline">{fr ? "Découvre notre objectif de 100 millions $" : "Explore our $100 million objective"}</Link>
        </section>
        <div className="mx-auto max-w-4xl px-5 pb-12">
          <Link
            to={campaignLink("/entrepreneurs/rendez-vous-intelligents", search)}
            className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] px-5 py-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>{fr ? "Voir comment Clara peut organiser un rendez-vous" : "See how Clara could arrange an appointment"}</span>
            <span aria-hidden="true" className="text-primary transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

      </div>
    </>
  );
};

export default PageEntrepreneursLanding;
