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
        <title>{fr ? "Professionnels et entreprises — Immobilier, entretien, rénovation | UNPRO" : "Professionals and businesses — Real estate, maintenance, renovation | UNPRO"}</title>
        <meta
          name="description"
          content={fr ? "Courtiers, professionnels, entreprises d’entretien et rénovateurs : découvrez votre audit et votre profil UNPRO. Professions réglementées sous examen." : "Brokers, property professionals, maintenance companies and renovators: discover your UNPRO audit and profile. Regulated professions subject to review."}
        />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs" />
      </Helmet>

      <div className="min-h-screen bg-background pb-24 lg:pb-0">
        <HeroV2 onTrackCta={trackCta} />
        <SectionPainV2 />
        <SectionSolutionV2 />
        <SectionHowItWorksV2 />
        <section className="mx-auto max-w-4xl px-5 py-10">
          <h2 className="text-2xl font-semibold">{fr ? "Un plan à la mesure de vos objectifs" : "A plan built around your goals"}</h2>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Parlez-nous de vos spécialités, de votre territoire et de votre capacité à prendre de nouveaux mandats." : "Tell us about your specialties, territory and capacity for new projects."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Vous examinez ensuite le contenu du plan, les rendez-vous inclus s’il y a lieu et le prix complet avant de décider." : "Then review the plan, any included appointments and the full price before deciding."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Professions réglementées : inscription et demande d’information sous examen. Aucune recommandation rémunérée avant autorisation et vérification appropriées." : "Regulated professions: registration and information requests subject to review. No paid recommendation before appropriate authorization and verification."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="h-auto min-h-12 whitespace-normal"><Link to={campaignLink(CONTRACTOR_PLAN_ENTRY_ROUTE, search, { from: "entrepreneurs_landing" })}>{fr ? "Définir mes objectifs" : "Set my goals"}</Link></Button>
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
