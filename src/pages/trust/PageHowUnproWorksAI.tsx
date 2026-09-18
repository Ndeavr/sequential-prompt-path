import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import InternalLinksTrust from "@/components/trust/InternalLinksTrust";
import {
  EditorialScene,
  RevealSection,
  ScrollStory,
  ScrollTextReveal,
  StackedCards,
} from "@/components/scroll-story/ScrollStory";
import { TrustFlowVisual } from "@/components/scroll-story/StoryVisuals";
import ImmersiveFooterGrid from "@/components/scroll-story/ImmersiveFooterGrid";

export default function PageHowUnproWorksAI() {
  return (
    <MainLayout hideMemorySection hideFooter>
      <Helmet>
        <title>Comment fonctionne l’IA UNPRO | Transparence</title>
        <meta name="description" content="Comprenez comment UNPRO structure un besoin, vérifie les signaux disponibles et recommande un entrepreneur compatible." />
        <link rel="canonical" href="https://unpro.ca/comment-fonctionne-ia" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "HowTo", name: "Comment UNPRO utilise l’IA pour comprendre un projet résidentiel",
          step: [
            { "@type": "HowToStep", name: "Comprendre", text: "Le besoin et le contexte du propriétaire sont structurés." },
            { "@type": "HowToStep", name: "Vérifier", text: "Les informations disponibles sont distinguées selon leur provenance." },
            { "@type": "HowToStep", name: "Recommander", text: "La conformité et la compatibilité déterminent la recommandation." },
          ],
        })}</script>
      </Helmet>
      <ScrollStory>
        <EditorialScene>
          <ScrollTextReveal align="center" eyebrow="Transparence" title="L’IA ne supprime pas la prudence." body="Elle automatise et enrichit la prudence. UNPRO structure les faits disponibles, montre leur provenance et garde la conformité au premier plan." />
        </EditorialScene>
        <RevealSection>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <ScrollTextReveal eyebrow="Trois mouvements" title="Comprendre. Vérifier. Recommander." body="Clara aide à clarifier la situation. UNPRO applique ensuite les règles d’éligibilité et cherche la compatibilité la plus défendable selon les informations disponibles." />
            <TrustFlowVisual />
          </div>
        </RevealSection>
        <RevealSection className="bg-muted/20">
          <StackedCards items={[
            { kicker: "Vérifié", title: "Un fait confirmé par une source défendable", body: "Une licence ou une donnée de conformité n’est présentée comme vérifiée que lorsque la source le permet." },
            { kicker: "Déclaré", title: "Une information fournie par la personne ou l’entreprise", body: "Les préférences, territoires et services déclarés restent identifiés comme tels." },
            { kicker: "Inféré", title: "Une conclusion prudente tirée du contexte", body: "Une inférence reste distincte d’un fait et peut être corrigée ou confirmée." },
            { kicker: "En attente", title: "Une information qui doit encore être confirmée", body: "L’absence de preuve n’est jamais remplacée par une donnée inventée." },
          ]} />
        </RevealSection>
        <EditorialScene className="min-h-[70svh]">
          <ScrollTextReveal align="center" title="La meilleure compatibilité selon les informations disponibles." body="Commencez par expliquer votre situation à Clara.">
            <Button asChild size="lg" className="mt-8 gap-2"><Link to="/alex">Parler à Clara <ArrowRight className="h-4 w-4" /></Link></Button>
          </ScrollTextReveal>
        </EditorialScene>
        <RevealSection><InternalLinksTrust currentPath="/comment-fonctionne-ia" /></RevealSection>
        <ImmersiveFooterGrid />
      </ScrollStory>
    </MainLayout>
  );
}