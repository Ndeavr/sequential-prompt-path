/**
 * HomeProfessionalAdaptive — PageHomeProfessional with Alex Orb + compact counter + stable graph.
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
import { PROFESSIONAL_PAINS } from "@/components/adaptive-home/painData";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const PRO_CHIPS: IntentChip[] = [
  { id: "clients", label: "Trouver mes clients idéaux", emoji: "🎯" },
  { id: "opportunities", label: "Voir mes opportunités", emoji: "📈" },
  { id: "position", label: "Vérifier mon positionnement", emoji: "🔍" },
  { id: "activate", label: "Activer mon profil", emoji: "🚀" },
  { id: "score", label: "Comprendre mon score", emoji: "📊" },
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

      <BarStickyCounterRealtime intentLabel="demandes mieux qualifiées" metricType="submissions" />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentWithAlexOrb
          title="Recevez des clients déjà qualifiés, pas des demandes génériques."
          subtitle="UNPRO filtre, comprend l'intention et vous connecte avec les bons clients."
          intentFeature="professional"
          ctaPrimary={{ label: "Recevoir mes clients qualifiés", onClick: () => navigate("/entrepreneur/join") }}
          ctaSecondary={{ label: "Activer mon profil professionnel", onClick: () => openAlex("professional") }}
          counterPrimary={{ type: "custom", label: "demandes mieux qualifiées", customValue: 14286 }}
          counterSecondary={{ type: "custom", label: "correspondances plus précises", customValue: 9842 }}
          graphStyle="stable"
          graphBaseValue={80}
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
