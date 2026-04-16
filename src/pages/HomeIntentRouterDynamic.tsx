/**
 * HomeIntentRouterDynamic — Generic intent page (PageHomeGenericIntent).
 * Qualifies the visitor instantly with chips + Alex + mini counter.
 */
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionIntentTrigger from "@/components/intent-pages/HeroSectionIntentTrigger";
import ChipsQuickIntentSelector from "@/components/intent-pages/ChipsQuickIntentSelector";
import SectionProofIA from "@/components/intent-pages/SectionProofIA";
import StickyMiniCounterBar from "@/components/impact-counter/StickyMiniCounterBar";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const GENERIC_CHIPS: IntentChip[] = [
  { id: "cold", label: "Trop froid", emoji: "🥶" },
  { id: "hot", label: "Trop chaud", emoji: "🥵" },
  { id: "humidity", label: "Humidité / moisissure", emoji: "💧" },
  { id: "emergency", label: "Urgence", emoji: "🚨" },
  { id: "quotes", label: "Comparer soumissions", emoji: "📄" },
  { id: "verify", label: "Vérifier entrepreneur", emoji: "✅" },
  { id: "unknown", label: "Je ne sais pas", emoji: "🤷" },
];

export default function HomeIntentRouterDynamic() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();

  const handleChip = (chip: IntentChip) => {
    openAlex("home_intent", chip.label);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Votre projet, notre match | IA 24/7</title>
        <meta name="description" content="Décrivez votre besoin en 5 secondes. UNPRO trouve le bon professionnel et vous donne un rendez-vous garanti." />
        <link rel="canonical" href="https://unpro.ca/intent" />
      </Helmet>

      <StickyMiniCounterBar />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentTrigger
          title="Bonjour, je suis Alex. Qu'est-ce qui se passe chez vous?"
          subtitle="Décrivez votre besoin ou sélectionnez une option. On s'occupe du reste."
          ctaPrimary={{ label: "Parler à Alex", onClick: () => openAlex("home_intent") }}
          ctaSecondary={{ label: "Uploader une photo", onClick: () => navigate("/diagnostic-photo") }}
        />

        <ChipsQuickIntentSelector chips={GENERIC_CHIPS} onSelect={handleChip} className="mt-2" />

        <SectionProofIA
          contextText="Des milliers de Québécois utilisent déjà UNPRO"
          className="mt-8"
        />
      </div>
    </MainLayout>
  );
}
