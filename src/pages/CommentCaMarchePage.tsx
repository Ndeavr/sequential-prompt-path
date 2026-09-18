import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import {
  EditorialScene,
  RevealSection,
  ScrollStory,
  ScrollTextReveal,
  StackedCards,
} from "@/components/scroll-story/ScrollStory";
import { PreparedProjectVisual, TrustFlowVisual } from "@/components/scroll-story/StoryVisuals";
import ImmersiveFooterGrid from "@/components/scroll-story/ImmersiveFooterGrid";

const dimensions = [
  { kicker: "Projet", title: "La réalité technique", body: "Le besoin, la spécialité, la complexité, la propriété et les contraintes connues." },
  { kicker: "Territoire", title: "La réalité géographique", body: "La zone desservie et les contraintes de déplacement applicables." },
  { kicker: "Temps", title: "La réalité opérationnelle", body: "L’urgence, la fenêtre souhaitée, la capacité et la disponibilité revalidée." },
  { kicker: "Budget", title: "La réalité financière", body: "Le budget déclaré, le minimum de projet et les attentes de valeur lorsqu’ils sont disponibles." },
  { kicker: "Façon de travailler", title: "Le facteur humain", body: "Le niveau d’implication, le style de communication et les priorités déclarées du propriétaire et de l’entrepreneur." },
  { kicker: "Confiance", title: "Les preuves disponibles", body: "La conformité, les signaux vérifiables, l’expérience comparable et la provenance des informations." },
];

const faq = [
  { q: "Pourquoi UNPRO ne demande pas trois soumissions?", a: "UNPRO recommande un entrepreneur compatible plutôt que de partager le même projet. La prudence demeure : conformité, provenance et explication de la recommandation." },
  { q: "Comment la compatibilité est-elle déterminée?", a: "UNPRO croise les dimensions réellement disponibles. Les règles de conformité sont obligatoires et passent avant les préférences ou la visibilité." },
  { q: "Que fait Clara?", a: "Clara clarifie le besoin, le contexte et les préférences utiles, une question à la fois. Elle n’invente pas les informations manquantes." },
];

export default function CommentCaMarchePage() {
  return (
    <MainLayout hideMemorySection hideFooter>
      <Helmet>
        <title>Comment fonctionne le jumelage UNPRO</title>
        <meta name="description" content="UNPRO tient compte du projet, du territoire, du temps, du budget, de la façon de travailler et des preuves disponibles." />
        <link rel="canonical" href="https://unpro.ca/comment-ca-marche" />
        <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) })}</script>
      </Helmet>
      <ScrollStory>
        <EditorialScene>
          <ScrollTextReveal eyebrow="L’IA inclut le facteur humain" title="Le bon métier ne suffit pas." body="UNPRO cherche l’entrepreneur le plus compatible avec le projet, la situation et la façon dont vous souhaitez avancer — selon les informations réellement disponibles.">
            <Button asChild size="lg" className="mt-8 gap-2"><Link to="/alex">Expliquer mon projet à Clara <ArrowRight className="h-4 w-4" /></Link></Button>
          </ScrollTextReveal>
        </EditorialScene>
        <RevealSection>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <ScrollTextReveal eyebrow="Avant la recommandation" title="Clara transforme une situation en contexte utile." body="Besoin, risque, urgence, préférences et contraintes sont clarifiés seulement lorsqu’ils peuvent changer la recommandation." />
            <PreparedProjectVisual />
          </div>
        </RevealSection>
        <RevealSection className="bg-muted/20">
          <ScrollTextReveal title="Plusieurs dimensions. Une recommandation expliquée." />
          <StackedCards className="mt-10" items={dimensions} />
        </RevealSection>
        <RevealSection>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <TrustFlowVisual />
            <ScrollTextReveal eyebrow="Ordre obligatoire" title="La conformité avant la compatibilité." body="Une licence requise qui n’est pas vérifiable comme active exclut l’entrepreneur. Les avis, la visibilité ou un forfait ne remplacent jamais ce contrôle." />
          </div>
        </RevealSection>
        <RevealSection className="bg-muted/20">
          <ScrollTextReveal title="Questions fréquentes" />
          <div className="mt-8 space-y-3">
            {faq.map((item) => <details key={item.q} className="rounded-lg border border-border bg-card p-5"><summary className="cursor-pointer font-semibold text-foreground">{item.q}</summary><p className="mt-3 text-sm leading-relaxed text-readable-soft">{item.a}</p></details>)}
          </div>
        </RevealSection>
        <EditorialScene className="min-h-[70svh]"><ScrollTextReveal align="center" title="Une seule recommandation intelligente." body="Commencez par votre situation. Clara poursuit avec la prochaine question utile."><Button asChild size="lg" className="mt-8"><Link to="/alex">Parler à Clara</Link></Button></ScrollTextReveal></EditorialScene>
        <ImmersiveFooterGrid />
      </ScrollStory>
    </MainLayout>
  );
}