/**
 * HomeContractorAdaptive — Intent-driven contractor landing with mini counter.
 */
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useAdaptiveSession } from "@/hooks/useAdaptiveSession";
import HeroSectionIntentTrigger from "@/components/intent-pages/HeroSectionIntentTrigger";
import ChipsQuickIntentSelector from "@/components/intent-pages/ChipsQuickIntentSelector";
import SectionProofIA from "@/components/intent-pages/SectionProofIA";
import BlockProofInstant from "@/components/intent-pages/BlockProofInstant";
import StickyMiniCounterBar from "@/components/impact-counter/StickyMiniCounterBar";
import GridPainSelectionInteractive from "@/components/adaptive-home/GridPainSelectionInteractive";
import PanelDynamicContentSwitch from "@/components/adaptive-home/PanelDynamicContentSwitch";
import PanelAlexRealtimeAssist from "@/components/adaptive-home/PanelAlexRealtimeAssist";
import { CONTRACTOR_PAINS } from "@/components/adaptive-home/painData";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const CONTRACTOR_CHIPS: IntentChip[] = [
  { id: "revenue", label: "Objectif revenus", emoji: "💰" },
  { id: "rdv", label: "Nombre de RDV", emoji: "📅" },
  { id: "score", label: "Voir mon score", emoji: "📊" },
];

export default function HomeContractorAdaptive() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const { selectedPain, stage, selectPain, engage } = useAdaptiveSession("contractor");

  const handleCta = () => {
    engage();
    navigate(selectedPain?.ctaHref ?? "/entrepreneur/plan");
  };

  const handleChip = (chip: IntentChip) => {
    if (chip.id === "score") return navigate("/aipp");
    openAlex("contractor", chip.label);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Entrepreneurs: recevez des rendez-vous garantis</title>
        <meta name="description" content="Arrêtez de payer par clic. UNPRO vous envoie des rendez-vous qualifiés directement dans votre agenda." />
      </Helmet>

      <StickyMiniCounterBar />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentTrigger
          title="Fatigué de courir après des leads?"
          subtitle="Des rendez-vous réels, pas des leads partagés. Activez votre croissance."
          ctaPrimary={{ label: "Voir mon score AIPP", onClick: () => navigate("/aipp") }}
          ctaSecondary={{ label: "Obtenir mes premiers rendez-vous", onClick: () => navigate("/entrepreneur/plan") }}
        />

        <ChipsQuickIntentSelector chips={CONTRACTOR_CHIPS} onSelect={handleChip} className="mt-2" />

        <SectionProofIA contextText="Des rendez-vous réels, pas des leads partagés" className="mt-6" />

        <BlockProofInstant
          items={[
            { stat: "12x", label: "ROI moyen" },
            { stat: "85%", label: "Taux de fermeture" },
            { stat: "0", label: "Lead partagé" },
          ]}
          className="mt-4"
        />

        <GridPainSelectionInteractive
          pains={CONTRACTOR_PAINS}
          selectedId={selectedPain?.id ?? null}
          onSelect={selectPain}
        />
        <PanelDynamicContentSwitch selectedPain={selectedPain} />
        <PanelAlexRealtimeAssist selectedPain={selectedPain} onTalk={handleCta} />
      </div>
    </MainLayout>
  );
}
