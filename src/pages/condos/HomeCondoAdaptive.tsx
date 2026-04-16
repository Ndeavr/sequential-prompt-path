/**
 * HomeCondoAdaptive — Intent-driven condo manager landing with mini counter.
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
import { CONDO_PAINS } from "@/components/adaptive-home/painData";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const CONDO_CHIPS: IntentChip[] = [
  { id: "loi16", label: "Loi 16", emoji: "📋" },
  { id: "fonds", label: "Fonds de prévoyance", emoji: "🏦" },
  { id: "travaux", label: "Travaux", emoji: "🔧" },
];

export default function HomeCondoAdaptive() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const { selectedPain, stage, selectPain, engage } = useAdaptiveSession("condo");

  const handleCta = () => {
    engage();
    navigate(selectedPain?.ctaHref ?? "/condo");
  };

  const handleChip = (chip: IntentChip) => {
    openAlex("condo", chip.label);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO Condo — Gestion intelligente de copropriété</title>
        <meta name="description" content="Entretien préventif, Loi 16, urgences — tout en un seul endroit pour votre syndicat de copropriété." />
      </Helmet>

      <StickyMiniCounterBar />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentTrigger
          title="Simplifiez la gestion de votre immeuble."
          subtitle="Loi 16, entretien, urgences — UNPRO centralise tout pour votre copropriété."
          ctaPrimary={{ label: "Créer mon Passeport Condo", onClick: () => navigate("/condo") }}
        />

        <ChipsQuickIntentSelector chips={CONDO_CHIPS} onSelect={handleChip} className="mt-2" />

        <SectionProofIA contextText="Centralisation • Conformité • Historique complet" className="mt-6" />

        <BlockProofInstant
          items={[
            { stat: "100%", label: "Conformité Loi 16" },
            { stat: "< 2 min", label: "Rapport instantané" },
            { stat: "24/7", label: "Suivi intelligent" },
          ]}
          className="mt-4"
        />

        <GridPainSelectionInteractive
          pains={CONDO_PAINS}
          selectedId={selectedPain?.id ?? null}
          onSelect={selectPain}
        />
        <PanelDynamicContentSwitch selectedPain={selectedPain} />
        <PanelAlexRealtimeAssist selectedPain={selectedPain} onTalk={handleCta} />
      </div>
    </MainLayout>
  );
}
