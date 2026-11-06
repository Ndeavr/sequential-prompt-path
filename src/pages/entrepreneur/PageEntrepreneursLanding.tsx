import { Link, useLocation } from "react-router-dom";
import { CONTRACTOR_PLAN_ENTRY_ROUTE } from "@/lib/routing/contractorPlanRoute";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import HeroV2 from "@/components/entrepreneur-landing/v2/HeroV2";
import SectionPainV2 from "@/components/entrepreneur-landing/v2/SectionPainV2";
import SectionSolutionV2 from "@/components/entrepreneur-landing/v2/SectionSolutionV2";
import SectionHowItWorksV2 from "@/components/entrepreneur-landing/v2/SectionHowItWorksV2";
import StickyMobileCTAV2 from "@/components/entrepreneur-landing/v2/StickyMobileCTAV2";

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
          content={fr ? "Rénovation–Construction, entretien et immobilier : présentez vos spécialités à UNPRO. Clara recherche une compatibilité entre les projets des propriétaires et votre entreprise." : "Renovation–Construction, property care and real estate: introduce your specialties to UNPRO. Clara looks for a fit between homeowner projects and your business."}
        />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs" />
      </Helmet>

      <div className="min-h-screen bg-background pb-24 lg:pb-0">
        <HeroV2 onTrackCta={trackCta} />
        <SectionHowItWorksV2 />
        <SectionSolutionV2 />
        <SectionPainV2 />
        <section className="mx-auto max-w-4xl px-5 py-10">
          <h2 className="text-2xl font-semibold">{fr ? "Ce que votre inscription vous apporte" : "What your registration provides"}</h2>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "L’activation de base comprend votre profil entreprise et 12 mois de présence IA sur UNPRO. Votre profil rassemble vos services, votre expertise, vos territoires et les mandats que vous recherchez." : "Base activation includes your business profile and 12 months of AI presence on UNPRO. Your profile brings together your services, expertise, service areas and preferred projects."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Vous choisissez ensuite le plan adapté à vos objectifs. Son prix complet et les rendez-vous inclus, s’il y a lieu, sont présentés avant le paiement." : "Choose the plan that fits your goals. You see the full price and any included appointments before payment."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Professions réglementées : inscription et demande d’information sous examen. Aucune recommandation rémunérée avant autorisation et vérification appropriées." : "Regulated professions: registration and information requests subject to review. No paid recommendation before appropriate authorization and verification."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="h-auto min-h-12 whitespace-normal"><Link to={campaignLink(CONTRACTOR_PLAN_ENTRY_ROUTE, search, { from: "entrepreneurs_landing" })}>{fr ? "Définir les projets que je veux" : "Define my ideal projects"}</Link></Button>
            <Button asChild variant="outline" className="h-auto min-h-12 whitespace-normal"><Link to={campaignLink("/entrepreneurs/audit-ia", search)}>{fr ? "Faire mon audit IA gratuit" : "Get my free AI audit"}</Link></Button>
          </div>
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
        <StickyMobileCTAV2 onTrackCta={trackCta} />
      </div>
    </>
  );
};

export default PageEntrepreneursLanding;
