/**
 * HomeCondoAdaptive — PageHomeCondoManager with Alex Orb + compact counter + steady graph.
 */
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useAdaptiveSession } from "@/hooks/useAdaptiveSession";
import HeroSectionIntentWithAlexOrb from "@/components/intent-pages/HeroSectionIntentWithAlexOrb";
import ChipsQuickIntentSelector from "@/components/intent-pages/ChipsQuickIntentSelector";
import SectionProofIA from "@/components/intent-pages/SectionProofIA";
import BlockProofInstant from "@/components/intent-pages/BlockProofInstant";
import BarStickyCounterRealtime from "@/components/impact-counter/BarStickyCounterRealtime";
import GridPainSelectionInteractive from "@/components/adaptive-home/GridPainSelectionInteractive";
import PanelDynamicContentSwitch from "@/components/adaptive-home/PanelDynamicContentSwitch";
import PanelAlexRealtimeAssist from "@/components/adaptive-home/PanelAlexRealtimeAssist";
import { CONDO_PAINS } from "@/components/adaptive-home/painData";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const CONDO_CHIPS: IntentChip[] = [
  { id: "loi16", label: "Loi 16", emoji: "📋" },
  { id: "fonds", label: "Fonds de prévoyance", emoji: "🏦" },
  { id: "travaux", label: "Historique des travaux", emoji: "🔧" },
  { id: "passport", label: "Passeport Condo", emoji: "🏢" },
  { id: "next", label: "Préparer les prochaines interventions", emoji: "📅" },
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
    if (chip.id === "passport") return navigate("/condo");
    openAlex("condo", chip.label);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO Condo — Gestion intelligente de copropriété</title>
        <meta name="description" content="Entretien préventif, Loi 16, urgences — tout en un seul endroit pour votre syndicat de copropriété." />
      </Helmet>

      <BarStickyCounterRealtime />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentWithAlexOrb
          title="Simplifiez la gestion de votre immeuble avec une intelligence structurée."
          subtitle="Centralisez les travaux, la conformité et les prochaines décisions avec Alex."
          intentFeature="condo"
          ctaPrimary={{ label: "Créer mon Passeport Condo", onClick: () => navigate("/condo") }}
          ctaSecondary={{ label: "Parler à Alex", onClick: () => openAlex("condo") }}
          counterPrimary={{ type: "custom", label: "interventions mieux structurées", customValue: 11624 }}
          counterSecondary={{ type: "custom", label: "décisions accélérées", customValue: 7436 }}
          graphStyle="steady"
          graphBaseValue={70}
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
