import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import MainLayout from "@/layouts/MainLayout";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { contractorPlanLink } from "@/lib/routing/contractorPlanRoute";
import {
  EditorialScene,
  RevealSection,
  ScrollStory,
  ScrollTextReveal,
  StackedCards,
} from "@/components/scroll-story/ScrollStory";
import { ContractorIntelligenceVisual, PreparedProjectVisual } from "@/components/scroll-story/StoryVisuals";
import ImmersiveFooterGrid from "@/components/scroll-story/ImmersiveFooterGrid";

const STEPS = [
  { kicker: "01 · Comprendre", title: "Votre entreprise réelle", body: "Le nom, le site, les sources publiques et les informations existantes servent à préparer le profil. Vous confirmez ce qui vous appartient." },
  { kicker: "02 · Structurer", title: "Vos services et spécialités", body: "Les services restent reliés à votre métier principal. Vous classez ce que vous priorisez, acceptez ou ne recherchez pas." },
  { kicker: "03 · Délimiter", title: "Votre territoire et votre capacité", body: "Vous indiquez où vous travaillez, ce que vous recherchez et quand votre entreprise peut réellement accepter un projet." },
  { kicker: "04 · Vérifier", title: "Votre conformité", body: "Les règles RBQ et les autres exigences applicables passent avant la visibilité ou la recommandation." },
  { kicker: "05 · Compatibilité", title: "Un projet préparé", body: "UNPRO croise le besoin, le territoire, les services, les préférences et la disponibilité selon les informations disponibles." },
  { kicker: "06 · Rendez-vous", title: "Une recommandation exclusive", body: "Lorsqu’un projet correspond, UNPRO recommande un entrepreneur compatible plutôt que de partager le même lead." },
];

export default function PageEntrepreneurHowItWorks() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const planHref = contractorPlanLink({ objective: "more_appointments", from: "contractor_how_it_works" });
  return (
    <MainLayout hideMemorySection hideFooter>
      <Helmet>
        <title>Comment ça marche — UNPRO pour entrepreneurs</title>
        <meta name="description" content="Découvrez comment UNPRO comprend votre entreprise, structure votre profil et prépare des rendez-vous exclusifs compatibles." />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs/comment-ca-marche" />
      </Helmet>
      <ScrollStory>
        <EditorialScene>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <ScrollTextReveal eyebrow="Pour entrepreneurs" title="De votre entreprise au bon rendez-vous." body="UNPRO ne vous transforme pas en fiche générique. Votre métier, vos services, votre territoire et vos objectifs structurent le parcours." />
            <ContractorIntelligenceVisual />
          </div>
        </EditorialScene>
        <RevealSection className="bg-muted/20"><StackedCards items={STEPS} /></RevealSection>
        <RevealSection>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <PreparedProjectVisual />
            <ScrollTextReveal eyebrow="Pas trois soumissions" title="Un projet. Un entrepreneur compatible." body="La conformité agit comme filtre obligatoire. La compatibilité vient ensuite, avec une explication fondée sur les informations disponibles." />
          </div>
        </RevealSection>
        <EditorialScene className="min-h-[70svh]">
          <ScrollTextReveal align="center" title="Découvrez votre plan personnalisé." body="Clara peut comprendre votre entreprise avant de vous diriger vers la prochaine étape utile.">
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => openAlex("contractor_onboarding", "Comprends mon entreprise.")} className="gap-2"><Mic className="h-4 w-4" /> Parler à Clara</Button>
              <Button size="lg" variant="outline" onClick={() => navigate(planHref)} className="gap-2">Voir mon plan personnalisé <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </ScrollTextReveal>
        </EditorialScene>
        <ImmersiveFooterGrid />
      </ScrollStory>
    </MainLayout>
  );
}