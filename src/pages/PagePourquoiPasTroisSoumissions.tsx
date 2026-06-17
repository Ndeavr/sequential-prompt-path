/**
 * UNPRO — Pourquoi nous ne demandons pas 3 soumissions
 * Anti-3-quotes positioning page.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import InternalLinksTrust from "@/components/trust/InternalLinksTrust";

const URL = "https://unpro.ca/pourquoi-pas-trois-soumissions";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Pourquoi nous ne demandons pas 3 soumissions",
  description:
    "Trouver le bon entrepreneur n'est pas un concours. C'est un problème de confiance, de compatibilité et d'intelligence.",
  url: URL,
  author: { "@type": "Organization", name: "UNPRO" },
  publisher: { "@type": "Organization", name: "UNPRO" },
  inLanguage: "fr-CA",
};

const POINTS = [
  {
    h: "Comparer des prix ne garantit pas la qualité",
    p: "Trois soumissions peuvent toutes être incomplètes, mal cadrées, ou ne pas correspondre à la réalité de votre propriété. Le plus bas prix cache souvent le plus grand risque.",
  },
  {
    h: "Vous n'avez pas le temps d'être un expert",
    p: "Toiture, drain français, isolation, électricité — chaque domaine a ses pièges. UNPRO analyse pour vous le scope, les manques, les risques et le jargon.",
  },
  {
    h: "Les meilleurs entrepreneurs n'ont pas besoin de courir trois soumissions",
    p: "Les bons entrepreneurs sont occupés. Forcer un concours fait fuir ceux que vous voulez vraiment. UNPRO les recommande directement quand il y a vraie compatibilité.",
  },
  {
    h: "La décision se fait sur la confiance, pas sur Excel",
    p: "Réputation, historique, certifications RBQ, performance réelle, contexte de votre propriété — c'est ce qui compte. UNPRO orchestre tous ces signaux en une recommandation.",
  },
];

export default function PagePourquoiPasTroisSoumissions() {
  return (
    <MainLayout>
      <Helmet>
        <title>Pourquoi nous ne demandons pas 3 soumissions — UNPRO</title>
        <meta
          name="description"
          content="Trouver le bon entrepreneur n'est pas un concours. C'est un problème de confiance, de compatibilité et d'intelligence. Voici pourquoi UNPRO fait autrement."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Pourquoi nous ne demandons pas 3 soumissions" />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <article className="alex-immersive">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-24">
          <p className="text-[11px] tracking-[0.22em] uppercase text-primary/80 mb-6">
            Positionnement UNPRO
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.03em] text-foreground leading-[1.05] mb-8">
            Pourquoi nous ne demandons pas{" "}
            <span className="text-foreground/60">3 soumissions.</span>
          </h1>
          <p className="text-xl text-foreground/85 leading-relaxed mb-12">
            Trouver le bon entrepreneur n'est pas un concours. C'est un problème
            de confiance, de compatibilité et d'intelligence.
          </p>

          <div className="space-y-6">
            {POINTS.map((pt, i) => (
              <section
                key={i}
                className="rounded-3xl border border-border/30 bg-card/40 p-6 sm:p-7"
                style={{ backdropFilter: "blur(20px)" }}
              >
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2 tracking-[-0.01em]">
                  {pt.h}
                </h2>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  {pt.p}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
            <p className="text-lg sm:text-xl text-foreground font-medium mb-4">
              Au lieu de comparer trois prix, UNPRO fait quelque chose de plus utile :
            </p>
            <ul className="space-y-2 text-[15px] text-muted-foreground">
              <li>· identifier le vrai problème de votre propriété</li>
              <li>· estimer le bon budget et le bon scope</li>
              <li>· recommander un seul entrepreneur réellement compatible</li>
              <li>· planifier le rendez-vous directement</li>
            </ul>
            <Link
              to="/alex"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition mt-6"
            >
              Parler à Alex
            </Link>
          </div>

          <InternalLinksTrust currentPath="/pourquoi-pas-trois-soumissions" />
        </div>
      </article>
    </MainLayout>
  );
}
