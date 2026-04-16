/**
 * HomeHomeownerAdaptive — Pain-driven adaptive landing for homeowners.
 */
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useAdaptiveSession } from "@/hooks/useAdaptiveSession";
import HeroSectionPainTriggerDynamic from "@/components/adaptive-home/HeroSectionPainTriggerDynamic";
import GridPainSelectionInteractive from "@/components/adaptive-home/GridPainSelectionInteractive";
import PanelDynamicContentSwitch from "@/components/adaptive-home/PanelDynamicContentSwitch";
import PanelAlexRealtimeAssist from "@/components/adaptive-home/PanelAlexRealtimeAssist";
import { HOMEOWNER_PAINS } from "@/components/adaptive-home/painData";
import SectionHomeCounterImpactIA from "@/components/impact-counter/SectionHomeCounterImpactIA";

export default function HomeHomeownerAdaptive() {
  const navigate = useNavigate();
  const { selectedPain, stage, selectPain, engage } = useAdaptiveSession("homeowner");

  const handleCta = () => {
    engage();
    navigate(selectedPain?.ctaHref ?? "/alex");
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Trouvez le bon pro pour votre maison</title>
        <meta name="description" content="Décrivez votre problème. UNPRO trouve le professionnel idéal et vous donne un rendez-vous garanti." />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <HeroSectionPainTriggerDynamic
          defaultTitle="Quel problème voulez-vous régler?"
          defaultSub="Sélectionnez votre irritant. On s'occupe du reste."
          defaultCta="Parler à Alex"
          defaultCtaHref="/alex"
          selectedPain={selectedPain}
          stage={stage}
          onCtaClick={handleCta}
        />
        <GridPainSelectionInteractive
          pains={HOMEOWNER_PAINS}
          selectedId={selectedPain?.id ?? null}
          onSelect={selectPain}
        />
        <PanelDynamicContentSwitch selectedPain={selectedPain} />
        <PanelAlexRealtimeAssist selectedPain={selectedPain} onTalk={() => navigate("/alex")} />
        <SectionHomeCounterImpactIA />
      </div>
    </MainLayout>
  );
}
