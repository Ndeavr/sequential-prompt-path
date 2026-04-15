/**
 * HomeCondoAdaptive — Pain-driven adaptive landing for condo managers.
 */
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useAdaptiveSession } from "@/hooks/useAdaptiveSession";
import HeroSectionPainTriggerDynamic from "@/components/adaptive-home/HeroSectionPainTriggerDynamic";
import GridPainSelectionInteractive from "@/components/adaptive-home/GridPainSelectionInteractive";
import PanelDynamicContentSwitch from "@/components/adaptive-home/PanelDynamicContentSwitch";
import PanelAlexRealtimeAssist from "@/components/adaptive-home/PanelAlexRealtimeAssist";
import { CONDO_PAINS } from "@/components/adaptive-home/painData";

export default function HomeCondoAdaptive() {
  const navigate = useNavigate();
  const { selectedPain, stage, selectPain, engage } = useAdaptiveSession("condo");

  const handleCta = () => {
    engage();
    navigate(selectedPain?.ctaHref ?? "/condo");
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO Condo — Gestion intelligente de copropriété</title>
        <meta name="description" content="Entretien préventif, Loi 16, urgences — tout en un seul endroit pour votre syndicat de copropriété." />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <HeroSectionPainTriggerDynamic
          defaultTitle="Quelle est la priorité de votre copropriété?"
          defaultSub="Sélectionnez votre situation. Alex coordonne le reste."
          defaultCta="Commencer avec Alex"
          defaultCtaHref="/alex"
          selectedPain={selectedPain}
          stage={stage}
          onCtaClick={handleCta}
        />
        <GridPainSelectionInteractive
          pains={CONDO_PAINS}
          selectedId={selectedPain?.id ?? null}
          onSelect={selectPain}
        />
        <PanelDynamicContentSwitch selectedPain={selectedPain} />
        <PanelAlexRealtimeAssist selectedPain={selectedPain} onTalk={() => navigate("/alex")} />
      </div>
    </MainLayout>
  );
}
