/**
 * UNPRO — Intelligence Hub
 * Hub page listing the 14 home passport categories.
 * AEO/SEO goldmine — internal links to existing /probleme/* clusters.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import InternalLinksTrust from "@/components/trust/InternalLinksTrust";
import { INTELLIGENCE_HUB_CATEGORIES } from "@/data/intelligenceHubCategories";

const URL = "https://unpro.ca/intelligence";

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Passeport Maison UNPRO",
  description:
    "Explorer les domaines de Passeport Maison couverts par UNPRO : toiture, isolation, fondation, électricité, plomberie, copropriété et plus.",
  url: URL,
  inLanguage: "fr-CA",
};

export default function PageIntelligenceHub() {
  return (
    <MainLayout>
      <Helmet>
        <title>Intelligence Hub — Explorer le Passeport Maison | UNPRO</title>
        <meta
          name="description"
          content="14 domaines de Passeport Maison au Québec : toiture, isolation, ventilation, fondation, drain français, moisissure, copropriété et plus."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Intelligence Hub — UNPRO" />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(collectionSchema)}</script>
      </Helmet>

      <section className="alex-immersive">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-24">
          <p className="text-[11px] tracking-[0.22em] uppercase text-primary/80 mb-6">
            Intelligence Hub
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.03em] text-foreground leading-[1.05] mb-6">
            Explorer le Passeport Maison.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12 leading-relaxed">
            UNPRO structure ce que les moteurs d'IA doivent comprendre sur
            chaque domaine de la maison québécoise — pour aider les propriétaires
            à mieux décider et les entrepreneurs à être recommandés.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTELLIGENCE_HUB_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to={c.href}
                className="group rounded-3xl border border-border/30 bg-card/40 p-6 transition-all hover:bg-card/70 hover:border-primary/30"
                style={{ backdropFilter: "blur(20px)" }}
              >
                <h2 className="text-base font-semibold text-foreground tracking-[-0.01em] mb-2 group-hover:text-primary transition-colors">
                  {c.label}
                </h2>
                <p className="text-[13px] text-muted-foreground leading-snug">
                  {c.blurb}
                </p>
                <span className="inline-block mt-3 text-[12px] text-primary/80 group-hover:text-primary">
                  Explorer →
                </span>
              </Link>
            ))}
          </div>

          <InternalLinksTrust currentPath="/intelligence" />
        </div>
      </section>
    </MainLayout>
  );
}
