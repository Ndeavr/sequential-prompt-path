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
import SmartFooter from "@/components/navigation/SmartFooter";
import {
  SectionPassportHero,
  SectionPassportPeriods,
  SectionPassportResale,
} from "@/components/passeport/SectionPassportStory";
import SectionPasseportValueProps from "@/components/passeport/SectionPasseportValueProps";
import {
  PASSPORT_META_TITLE,
  PASSPORT_META_DESCRIPTION,
  PASSPORT_HOME_TEASER,
} from "@/lib/copy/passportPositioning";

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

      <main>
        <SectionPassportHero />

        {/* Ce que le Passeport garde en mémoire */}
        <section className="border-t border-border/60">
          <div className="container mx-auto px-4 py-14">
            <h2 className="text-section text-foreground">{PASSPORT_HOME_TEASER.title}</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {PASSPORT_HOME_TEASER.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-sm text-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-5 max-w-2xl text-body leading-relaxed text-muted-foreground">
              {PASSPORT_HOME_TEASER.body}
            </p>
          </div>
        </section>

        <SectionPassportPeriods />
        <SectionPasseportValueProps />
        <SectionPassportResale />

        <section className="border-t border-border/60">
          <div className="container mx-auto px-4 py-10 text-center">
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Link to="/property-graph">Voir le graphe de connaissances UNPRO</Link>
            </Button>
          </div>
        </section>
      </main>

      <SmartFooter />
    </div>
  );
}
