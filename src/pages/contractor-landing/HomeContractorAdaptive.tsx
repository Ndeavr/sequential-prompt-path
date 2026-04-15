/**
 * HomeContractorAdaptive — Pain-driven adaptive landing for contractors.
 */
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useAdaptiveSession } from "@/hooks/useAdaptiveSession";
import HeroSectionPainTriggerDynamic from "@/components/adaptive-home/HeroSectionPainTriggerDynamic";
import GridPainSelectionInteractive from "@/components/adaptive-home/GridPainSelectionInteractive";
import PanelDynamicContentSwitch from "@/components/adaptive-home/PanelDynamicContentSwitch";
import PanelAlexRealtimeAssist from "@/components/adaptive-home/PanelAlexRealtimeAssist";
import { CONTRACTOR_PAINS } from "@/components/adaptive-home/painData";

export default function HomeContractorAdaptive() {
  const navigate = useNavigate();
  const { selectedPain, stage, selectPain, engage } = useAdaptiveSession("contractor");

  const handleCta = () => {
    engage();
    navigate(selectedPain?.ctaHref ?? "/entrepreneur/plan");
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Entrepreneurs: recevez des rendez-vous garantis</title>
        <meta name="description" content="Arrêtez de payer par clic. UNPRO vous envoie des rendez-vous qualifiés directement dans votre agenda." />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <HeroSectionPainTriggerDynamic
          defaultTitle="Quel est votre plus gros frein à la croissance?"
          defaultSub="Cliquez sur votre irritant. On a la solution."
          defaultCta="Activer mes rendez-vous"
          defaultCtaHref="/entrepreneur/plan"
          selectedPain={selectedPain}
          stage={stage}
          onCtaClick={handleCta}
        />
        <GridPainSelectionInteractive
          pains={CONTRACTOR_PAINS}
          selectedId={selectedPain?.id ?? null}
          onSelect={selectPain}
        />
        <PanelDynamicContentSwitch selectedPain={selectedPain} />
        <PanelAlexRealtimeAssist selectedPain={selectedPain} onTalk={() => navigate("/alex")} />
      </div>
    </MainLayout>
  );
}
