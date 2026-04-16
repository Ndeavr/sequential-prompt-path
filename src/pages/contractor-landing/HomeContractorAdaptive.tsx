/**
 * HomeContractorAdaptive — PageHomeContractor with Alex Orb + compact counter + dynamic graph.
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
import { CONTRACTOR_PAINS } from "@/components/adaptive-home/painData";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const CONTRACTOR_CHIPS: IntentChip[] = [
  { id: "score", label: "Voir mon score", emoji: "📊" },
  { id: "presence", label: "Vérifier ma présence IA", emoji: "🤖" },
  { id: "revenue", label: "Simuler mes revenus", emoji: "💰" },
  { id: "import", label: "Importer mon entreprise", emoji: "🏢" },
  { id: "rdv", label: "Recevoir des rendez-vous", emoji: "📅" },
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
    if (chip.id === "import") return navigate("/entrepreneur/onboarding-voice");
    openAlex("contractor", chip.label);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Entrepreneurs: recevez des rendez-vous garantis</title>
        <meta name="description" content="Arrêtez de payer par clic. UNPRO vous envoie des rendez-vous qualifiés directement dans votre agenda." />
      </Helmet>

      <BarStickyCounterRealtime />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentWithAlexOrb
          title="Fatigué de courir après des leads ? Remplissez votre agenda avec de vrais rendez-vous."
          subtitle="UNPRO ne vend pas des clics. UNPRO active des rendez-vous qualifiés."
          intentFeature="contractor"
          ctaPrimary={{ label: "Voir mon score AIPP", onClick: () => navigate("/aipp") }}
          ctaSecondary={{ label: "Obtenir mes premiers rendez-vous", onClick: () => navigate("/entrepreneur/plan") }}
          counterPrimary={{ type: "dollars", label: "économisés en publicité" }}
          counterSecondary={{ type: "custom", label: "rendez-vous mieux qualifiés", customValue: 18924 }}
          graphStyle="dynamic"
          graphBaseValue={150}
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
