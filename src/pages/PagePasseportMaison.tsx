/**
 * UNPRO — Passeport Maison (page publique)
 * « Vous prenez soin de votre maison. Prouvez-le. »
 *
 * La mémoire documentée de la propriété et la preuve qu'elle a été bien entretenue.
 * Le graphe technique reste disponible sur /property-graph.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SmartHeader from "@/components/navigation/SmartHeader";
import {
  PASSPORT_META_TITLE,
  PASSPORT_META_DESCRIPTION,
  PASSPORT_HOME_TEASER,
} from "@/lib/copy/passportPositioning";
import { ArrowRight } from "lucide-react";
import {
  EditorialScene,
  RevealSection,
  ScrollStory,
  ScrollTextReveal,
  StackedCards,
} from "@/components/scroll-story/ScrollStory";
import { PassportLayersVisual } from "@/components/scroll-story/StoryVisuals";
import ImmersiveFooterGrid from "@/components/scroll-story/ImmersiveFooterGrid";

export default function PagePasseportMaison() {
  const canonical = "https://unpro.ca/proprietaires/passeport-maison";

  return (
    <div className="min-h-screen bg-background premium-bg">
      <Helmet>
        <title>Passeport Maison UNPRO — l'histoire documentée de votre propriété</title>
        <meta name="description" content={PASSPORT_META_DESCRIPTION} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={PASSPORT_META_TITLE} />
        <meta property="og:description" content={PASSPORT_META_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <SmartHeader />

      <ScrollStory>
        <main>
          <EditorialScene>
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <ScrollTextReveal eyebrow="Passeport Maison UNPRO" title="Votre maison a une histoire. Gardez-la vivante." body="Rassemblez les faits, photos, documents, équipements, travaux et observations qui permettent de mieux comprendre votre propriété au fil du temps.">
                <Button asChild size="lg" className="mt-8 gap-2"><Link to="/property-graph">Découvrir mon Passeport Maison <ArrowRight className="h-4 w-4" /></Link></Button>
              </ScrollTextReveal>
              <PassportLayersVisual />
            </div>
          </EditorialScene>

          <RevealSection className="bg-muted/20">
            <ScrollTextReveal title={PASSPORT_HOME_TEASER.title} body={PASSPORT_HOME_TEASER.body} />
            <div className="mt-8 flex flex-wrap gap-2">
              {PASSPORT_HOME_TEASER.items.map((item) => <span key={item} className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground">{item}</span>)}
            </div>
          </RevealSection>

          <RevealSection>
            <StackedCards items={[
              { kicker: "Une propriété évolue", title: "Les travaux la transforment", body: "Les projets, documents et intervenants peuvent être ajoutés à l’histoire de la propriété avec leur provenance." },
              { kicker: "Le temps passe", title: "L’entretien laisse des traces utiles", body: "Les observations et les actions documentées aident à préserver un contexte que la mémoire seule finit par perdre." },
              { kicker: "Un projet arrive", title: "Le contexte accompagne la décision", body: "Les informations disponibles peuvent éclairer une discussion avec Clara ou un professionnel, sans transformer une donnée déclarée en fait vérifié." },
              { kicker: "La maison change de mains", title: "Une histoire plus claire se transmet", body: "Le Passeport rassemble ce qui est connu, déclaré, inféré ou encore à confirmer au même endroit." },
            ]} />
          </RevealSection>

          <EditorialScene className="min-h-[70svh]">
            <ScrollTextReveal align="center" eyebrow="Une mémoire structurée" title="Comprendre hier. Décider aujourd’hui. Préparer demain." body="Le Passeport Maison donne un fil conducteur aux informations de votre propriété.">
              <Button asChild variant="outline" size="lg" className="mt-8"><Link to="/property-graph">Voir le graphe de connaissances UNPRO</Link></Button>
            </ScrollTextReveal>
          </EditorialScene>
        </main>
        <ImmersiveFooterGrid />
      </ScrollStory>
    </div>
  );
}
