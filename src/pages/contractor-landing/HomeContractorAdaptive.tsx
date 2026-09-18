import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { contractorPlanLink } from "@/lib/routing/contractorPlanRoute";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  EditorialScene,
  RevealSection,
  ScrollStory,
  ScrollTextReveal,
  SectionTransition,
  StackedCards,
  StickyMediaText,
} from "@/components/scroll-story/ScrollStory";
import ImmersiveFooterGrid from "@/components/scroll-story/ImmersiveFooterGrid";
import {
  ContractorIntelligenceVisual,
  PreparedProjectVisual,
  ServicePriorityVisual,
} from "@/components/scroll-story/StoryVisuals";

export default function HomeContractorAdaptive() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const planHref = contractorPlanLink({ objective: "more_appointments", from: "contractor_story" });

  return (
    <MainLayout hideMemorySection hideFooter>
      <Helmet>
        <title>UNPRO pour entrepreneurs — des rendez-vous compatibles et exclusifs</title>
        <meta name="description" content="UNPRO comprend votre entreprise, prépare les projets et recommande un entrepreneur compatible pour un rendez-vous exclusif." />
      </Helmet>
      <ScrollStory>
        <EditorialScene>
          <ScrollTextReveal
            eyebrow="UNPRO pour entrepreneurs"
            title="Vous n’avez pas besoin de plus de leads."
            body="Vous avez besoin de projets qui correspondent réellement à votre métier, votre territoire, votre capacité et votre façon de travailler."
          >
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate(planHref)} className="gap-2">Découvrez votre plan personnalisé <ArrowRight className="h-4 w-4" /></Button>
              <Button size="lg" variant="outline" onClick={() => openAlex("contractor", "Analyse mon entreprise.")} className="gap-2"><Sparkles className="h-4 w-4" /> Parler à Clara</Button>
            </div>
          </ScrollTextReveal>
        </EditorialScene>

        <SectionTransition>
          <EditorialScene className="min-h-[72svh] md:min-h-[86dvh]">
            <ScrollTextReveal title="Vous avez besoin des bons clients." body="UNPRO prépare le contexte avant de recommander. Le projet arrive avec les informations utiles, pas comme un nom revendu à plusieurs entreprises." />
          </EditorialScene>
        </SectionTransition>

        <RevealSection>
          <StickyMediaText media={<ContractorIntelligenceVisual />}>
            <ScrollTextReveal eyebrow="Clara comprend" title="Votre entreprise, avant de parler de forfait." body="Le métier, les services, le territoire, les projets recherchés et les signaux de confiance sont structurés à partir des informations réellement disponibles." />
            <ServicePriorityVisual />
          </StickyMediaText>
        </RevealSection>

        <RevealSection className="bg-muted/20">
          <StackedCards items={[
            { kicker: "Clara comprend", title: "Le besoin du propriétaire", body: "Le problème, l’urgence, le budget, les contraintes et la manière de décider sont clarifiés avant la recommandation." },
            { kicker: "UNPRO prépare", title: "Un projet exploitable", body: "Les éléments utiles sont rassemblés afin que l’entrepreneur sache pourquoi le rendez-vous correspond à son activité." },
            { kicker: "UNPRO matche", title: "La compatibilité réelle", body: "Les règles de conformité passent d’abord, puis les services, le territoire, la capacité, la disponibilité et les préférences sont croisés." },
            { kicker: "Rendez-vous", title: "Un échange exclusif", body: "UNPRO recommande un entrepreneur compatible. Le rendez-vous n’est jamais vendu simultanément à plusieurs entreprises." },
          ]} />
        </RevealSection>

        <EditorialScene>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <ScrollTextReveal eyebrow="Le résultat" title="Un rendez-vous exclusif. Jamais un lead partagé." body="Votre plan personnalisé part de votre réalité : services, territoire, capacité et objectif." />
            <PreparedProjectVisual />
          </div>
          <div className="mt-10"><Button size="lg" onClick={() => navigate(planHref)} className="gap-2">Découvrez votre plan personnalisé <ArrowRight className="h-4 w-4" /></Button></div>
        </EditorialScene>
        <ImmersiveFooterGrid />
      </ScrollStory>
    </MainLayout>
  );
}
