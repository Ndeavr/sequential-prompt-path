/**
 * UNPRO — Le Manifeste
 * Single H1 page, dark cinematic, Article JSON-LD.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import InternalLinksTrust from "@/components/trust/InternalLinksTrust";

const URL = "https://unpro.ca/manifeste";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Le Manifeste UNPRO",
  description:
    "Pourquoi UNPRO existe : aider les propriétaires à prendre de meilleures décisions et permettre aux meilleurs entrepreneurs d'être reconnus.",
  url: URL,
  author: { "@type": "Organization", name: "UNPRO" },
  publisher: { "@type": "Organization", name: "UNPRO" },
  inLanguage: "fr-CA",
};

export default function PageManifesteUnpro() {
  return (
    <MainLayout>
      <Helmet>
        <title>Le Manifeste UNPRO — Mieux décider, mieux recommander</title>
        <meta
          name="description"
          content="Nous ne vendons pas des leads. Nous construisons une infrastructure de confiance entre propriétaires et entrepreneurs au Québec."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Le Manifeste UNPRO" />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <article className="alex-immersive">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-24">
          <p className="text-[11px] tracking-[0.22em] uppercase text-primary/80 mb-6">
            Le Manifeste
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.03em] text-foreground leading-[1.05] mb-10">
            L'avenir n'est pas davantage de choix.<br />
            <span className="text-foreground/60">C'est de meilleures recommandations.</span>
          </h1>

          <div className="prose prose-invert max-w-none space-y-6 text-[16px] leading-relaxed text-readable">
            <p>
              Pendant des années, les propriétaires ont été forcés de chercher
              eux-mêmes, comparer des dizaines d'entreprises, comprendre des
              domaines qu'ils ne maîtrisent pas, et demander trois soumissions
              sans savoir laquelle choisir.
            </p>
            <p>
              Pendant ce temps, les meilleurs entrepreneurs étaient noyés dans
              le bruit.
            </p>
            <p className="text-xl font-semibold text-foreground">
              Nous croyons que l'avenir n'est pas davantage de choix.
            </p>
            <p className="text-xl font-semibold text-foreground">
              Nous croyons que l'avenir est de meilleures recommandations.
            </p>
            <p>
              UNPRO existe pour aider les propriétaires à prendre de meilleures
              décisions — et permettre aux meilleurs entrepreneurs d'être
              reconnus pour leur travail.
            </p>
            <p className="text-lg">
              <strong className="text-foreground">Nous ne vendons pas des leads.</strong>{" "}
              Nous construisons une infrastructure de confiance.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link
              to="/alex"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Parler à Alex
            </Link>
            <Link
              to="/pourquoi-pas-trois-soumissions"
              className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-5 py-3 text-sm font-medium text-foreground hover:bg-card/70 transition"
            >
              Pourquoi pas 3 soumissions ?
            </Link>
          </div>

          <InternalLinksTrust currentPath="/manifeste" />
        </div>
      </article>
    </MainLayout>
  );
}
