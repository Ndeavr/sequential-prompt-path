/**
 * HomeIntentRouterDynamic — PageHomeGenericIntent.
 * Qualifies the visitor instantly with Alex Orb + compact counter + mini graph.
 */
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionIntentWithAlexOrb from "@/components/intent-pages/HeroSectionIntentWithAlexOrb";
import ChipsQuickIntentSelector from "@/components/intent-pages/ChipsQuickIntentSelector";
import SectionProofIA from "@/components/intent-pages/SectionProofIA";
import BarStickyCounterRealtime from "@/components/impact-counter/BarStickyCounterRealtime";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { IntentChip } from "@/components/intent-pages/ChipsQuickIntentSelector";

const GENERIC_CHIPS: IntentChip[] = [
  { id: "cold", label: "Trop froid ou trop chaud", emoji: "🌡️" },
  { id: "humidity", label: "Humidité ou moisissure", emoji: "💧" },
  { id: "emergency", label: "J'ai une urgence", emoji: "🚨" },
  { id: "quotes", label: "Comparer des soumissions", emoji: "📄" },
  { id: "verify", label: "Vérifier un entrepreneur", emoji: "✅" },
  { id: "unknown", label: "Je ne sais pas encore", emoji: "🤷" },
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

      <BarStickyCounterRealtime />

      <div className="flex flex-col min-h-screen">
        <HeroSectionIntentWithAlexOrb
          title="Bonjour, je suis Alex. Qu'est-ce qui se passe chez vous ?"
          subtitle="Décrivez le problème, ajoutez une photo ou laissez l'IA vous guider."
          intentFeature="home_intent"
          ctaPrimary={{ label: "Parler à Alex", onClick: () => openAlex("home_intent") }}
          ctaSecondary={{ label: "Ajouter une photo ou une soumission", onClick: () => navigate("/diagnostic-photo") }}
          counterPrimary={{ type: "submissions", label: "soumissions évitées" }}
          counterSecondary={{ type: "custom", label: "décisions accélérées", customValue: 12482 }}
          graphStyle="smooth"
          graphBaseValue={120}
        />

        <ChipsQuickIntentSelector chips={GENERIC_CHIPS} onSelect={handleChip} className="mt-2" />

        <SectionProofIA contextText="Des milliers de Québécois utilisent déjà UNPRO" className="mt-8" />
      </div>
    </MainLayout>
  );
}
