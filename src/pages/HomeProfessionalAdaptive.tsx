/**
 * HomeProfessionalAdaptive — Pain-driven adaptive landing for professionals.
 */
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useAdaptiveSession } from "@/hooks/useAdaptiveSession";
import HeroSectionPainTriggerDynamic from "@/components/adaptive-home/HeroSectionPainTriggerDynamic";
import GridPainSelectionInteractive from "@/components/adaptive-home/GridPainSelectionInteractive";
import PanelDynamicContentSwitch from "@/components/adaptive-home/PanelDynamicContentSwitch";
import PanelAlexRealtimeAssist from "@/components/adaptive-home/PanelAlexRealtimeAssist";
import { PROFESSIONAL_PAINS } from "@/components/adaptive-home/painData";

export default function HomeProfessionalAdaptive() {
  const navigate = useNavigate();
  const { selectedPain, stage, selectPain, engage } = useAdaptiveSession("professional");

  const handleCta = () => {
    engage();
    navigate(selectedPain?.ctaHref ?? "/entrepreneur/join");
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Professionnels: croissance sans prospection</title>
        <meta name="description" content="Recevez des références qualifiées automatiquement. UNPRO fait la prospection pour vous." />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <HeroSectionPainTriggerDynamic
          defaultTitle="Qu'est-ce qui freine votre croissance?"
          defaultSub="Identifiez le blocage. On construit la solution."
          defaultCta="Rejoindre le réseau"
          defaultCtaHref="/entrepreneur/join"
          selectedPain={selectedPain}
          stage={stage}
          onCtaClick={handleCta}
        />
        <GridPainSelectionInteractive
          pains={PROFESSIONAL_PAINS}
          selectedId={selectedPain?.id ?? null}
          onSelect={selectPain}
        />
        <PanelDynamicContentSwitch selectedPain={selectedPain} />
        <PanelAlexRealtimeAssist selectedPain={selectedPain} onTalk={() => navigate("/alex")} />
      </div>
    </MainLayout>
  );
}
