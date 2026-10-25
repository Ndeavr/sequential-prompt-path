import { Link, useLocation } from "react-router-dom";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { OFFER_350 } from "@/lib/copy/offer350";
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
          <h2 className="text-2xl font-semibold">{fr ? OFFER_350.card.title : "Profile + 12 months of AI Presence on UNPRO"}</h2>
          <p className="mt-3 text-base text-muted-foreground">{fr ? OFFER_350.paymentNote : "One-time activation: CAD 350 plus applicable taxes. No subscription."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? OFFER_350.disclaimer : "No appointments or results are promised. Appointments require a separate confirmed quote before payment."}</p>
          <p className="mt-3 text-base text-muted-foreground">{fr ? "Professions réglementées : inscription et demande d’information sous examen. Aucune recommandation rémunérée avant autorisation et vérification appropriées." : "Regulated professions: registration and information requests subject to review. No paid recommendation before appropriate authorization and verification."}</p>
          <Button asChild variant="outline" className="mt-6 h-auto min-h-12 whitespace-normal"><Link to={campaignLink("/entrepreneurs/audit-ia", search)}>{fr ? "Faire mon audit IA gratuit" : "Get my free AI audit"}</Link></Button>
        </section>
        <StickyMobileCTAV2 onTrackCta={trackCta} />
      </div>
    </>
  );
};

export default PageEntrepreneursLanding;
