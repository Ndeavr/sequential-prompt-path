/**
 * HomeHomeownerAdaptive — Intent-driven homeowner landing with mini counter.
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
import { HOMEOWNER_PAINS } from "@/components/adaptive-home/painData";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const OWNER_CHIPS: IntentChip[] = [
  { id: "problem", label: "Décrire problème", emoji: "🔍" },
  { id: "photo", label: "Upload photo", emoji: "📸" },
  { id: "quotes", label: "Analyser soumissions", emoji: "📄" },
];

export default function HomeHomeownerAdaptive() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const { selectedPain, stage, selectPain, engage } = useAdaptiveSession("homeowner");

  const handleCta = () => {
    engage();
    navigate(selectedPain?.ctaHref ?? "/alex");
  };

  const handleChip = (chip: IntentChip) => {
    if (chip.id === "photo") return navigate("/diagnostic-photo");
    if (chip.id === "quotes") return navigate("/compare");
    openAlex("homeowner", chip.label);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Trouvez le bon pro pour votre maison</title>
        <meta name="description" content="Décrivez votre problème. UNPRO trouve le professionnel idéal et vous donne un rendez-vous garanti." />
      </Helmet>

      <StickyMiniCounterBar />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentTrigger
          title="Arrêtez les 3 soumissions. Trouvez le bon entrepreneur dès le départ."
          subtitle="Décrivez votre problème — on vous match avec le meilleur pro en secondes."
          ctaPrimary={{ label: "Trouver mon match parfait", onClick: () => openAlex("homeowner") }}
          ctaSecondary={{ label: "Analyser mes soumissions", onClick: () => navigate("/compare") }}
        />

        <ChipsQuickIntentSelector chips={OWNER_CHIPS} onSelect={handleChip} className="mt-2" />

        <SectionProofIA contextText="Moins de soumissions, plus de résultats" className="mt-6" />

        <BlockProofInstant
          items={[
            { stat: "~45 sec", label: "Estimation moyenne" },
            { stat: "1 800$", label: "Économie moyenne" },
            { stat: "98%", label: "Taux de satisfaction" },
          ]}
          className="mt-4"
        />

        <GridPainSelectionInteractive
          pains={HOMEOWNER_PAINS}
          selectedId={selectedPain?.id ?? null}
          onSelect={selectPain}
        />
        <PanelDynamicContentSwitch selectedPain={selectedPain} />
        <PanelAlexRealtimeAssist selectedPain={selectedPain} onTalk={handleCta} />
      </div>
    </MainLayout>
  );
}
