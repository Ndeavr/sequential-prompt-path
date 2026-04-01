import { Helmet } from "react-helmet-async";
import RelatedLinksSection from "@/components/shared/RelatedLinksSection";
import AdaptiveInputModeController from "@/components/adaptive-input/AdaptiveInputModeController";
import PageHero from "@/components/shared/PageHero";

export default function DecrireMonProjetPage() {
  return (
    <>
      <Helmet>
        <title>Décrire mon projet de rénovation | UNPRO</title>
        <meta name="description" content="Parlez à Alex, écrivez ou décrivez votre projet de rénovation. Simple, rapide, sans engagement. Obtenez un rendez-vous garanti." />
        <link rel="canonical" href="https://unpro.ca/decrire-mon-projet" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        <PageHero
          title="Comment pouvons-nous vous aider ?"
          subtitle="Parlez à Alex, écrivez-lui ou décrivez votre projet. Il trouve le bon professionnel pour vous."
          compact
        />

        <AdaptiveInputModeController
          feature="general"
          onProjectSubmit={(data) => {
            console.log("Project submitted:", data);
          }}
        />

        <RelatedLinksSection links={[
          { to: "/search", label: "Trouver un entrepreneur" },
          { to: "/parler-a-alex", label: "Parler à Alex" },
          { to: "/problemes-maison", label: "Problèmes maison" },
        ]} />
      </div>
    </>
  );
}
