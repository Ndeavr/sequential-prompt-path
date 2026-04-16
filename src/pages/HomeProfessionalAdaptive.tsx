/**
 * HomeProfessionalAdaptive — Intent-driven professional landing with mini counter.
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
import { PROFESSIONAL_PAINS } from "@/components/adaptive-home/painData";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const PRO_CHIPS: IntentChip[] = [
  { id: "domain", label: "Mon domaine", emoji: "🏗️" },
  { id: "clients", label: "Type de clients", emoji: "👥" },
  { id: "network", label: "Rejoindre le réseau", emoji: "🤝" },
];

export default function HomeProfessionalAdaptive() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const { selectedPain, stage, selectPain, engage } = useAdaptiveSession("professional");

  const handleCta = () => {
    engage();
    navigate(selectedPain?.ctaHref ?? "/entrepreneur/join");
  };

  const handleChip = (chip: IntentChip) => {
    openAlex("professional", chip.label);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Professionnels: croissance sans prospection</title>
        <meta name="description" content="Recevez des références qualifiées automatiquement. UNPRO fait la prospection pour vous." />
      </Helmet>

      <StickyMiniCounterBar />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentTrigger
          title="Recevez des clients déjà qualifiés."
          subtitle="Le matching IA d'UNPRO vous connecte aux bons projets, sans prospection."
          ctaPrimary={{ label: "Recevoir mes clients qualifiés", onClick: () => navigate("/entrepreneur/join") }}
        />

        <ChipsQuickIntentSelector chips={PRO_CHIPS} onSelect={handleChip} className="mt-2" />

        <SectionProofIA contextText="Matching IA • Clients qualifiés • Zéro prospection" className="mt-6" />

        <BlockProofInstant
          items={[
            { stat: "94%", label: "Matching précis" },
            { stat: "< 24h", label: "Premier contact" },
            { stat: "100%", label: "Exclusif" },
          ]}
          className="mt-4"
        />

        <GridPainSelectionInteractive
          pains={PROFESSIONAL_PAINS}
          selectedId={selectedPain?.id ?? null}
          onSelect={selectPain}
        />
        <PanelDynamicContentSwitch selectedPain={selectedPain} />
        <PanelAlexRealtimeAssist selectedPain={selectedPain} onTalk={handleCta} />
      </div>
    </MainLayout>
  );
}
