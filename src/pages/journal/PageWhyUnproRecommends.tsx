/**
 * How UNPRO uses AI to recommend the right entrepreneur.
 * French-first SEO article with SchemaStack.
 */
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { Link } from "react-router-dom";

const URL = "https://unpro.ca/journal/comment-unpro-recommande-le-bon-entrepreneur";
const TITLE = "Comment UNPRO utilise l'IA pour recommander le bon entrepreneur";
const DESC = "Pourquoi le meilleur entrepreneur pour votre voisin n'est peut-être pas le meilleur pour vous. UNPRO évalue plus de 50 critères de compatibilité avant chaque recommandation.";

const JSONLD_ARTICLE = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: TITLE,
  description: DESC,
  inLanguage: "fr-CA",
  author: { "@type": "Organization", name: "UNPRO" },
  publisher: { "@type": "Organization", name: "UNPRO", logo: { "@type": "ImageObject", url: "https://unpro.ca/unpro-favicon.svg" } },
  mainEntityOfPage: URL,
  datePublished: "2026-07-07",
  dateModified: "2026-07-07",
};

const JSONLD_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Pourquoi UNPRO ne demande-t-il pas 3 soumissions ?", acceptedAnswer: { "@type": "Answer", text: "Les trois soumissions comparent souvent trois offres incompatibles. UNPRO évalue plutôt la compatibilité — projet, budget, région, disponibilité, communication et performance — pour recommander un seul professionnel qualifié." } },
    { "@type": "Question", name: "Quels critères UNPRO évalue-t-il ?", acceptedAnswer: { "@type": "Answer", text: "Plus de 50 critères : type de projet, sous-catégorie, budget, région desservie, disponibilité, langue parlée, style de communication, allergies, contraintes de copropriété, performance vérifiée AIPP, historique de projets similaires." } },
    { "@type": "Question", name: "Comment UNPRO apprend-il de moi ?", acceptedAnswer: { "@type": "Answer", text: "Chaque réponse enrichit votre profil de préférences à long terme (langue, environnement, priorités). Les recommandations futures deviennent plus précises sans reposer les mêmes questions." } },
  ],
};

const JSONLD_BREADCRUMB = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca/" },
    { "@type": "ListItem", position: 2, name: "Journal", item: "https://unpro.ca/journal" },
    { "@type": "ListItem", position: 3, name: TITLE, item: URL },
  ],
};

export default function PageWhyUnproRecommends() {
  return (
    <MainLayout>
      <Helmet>
        <title>{TITLE} — UNPRO</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={URL} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(JSONLD_ARTICLE)}</script>
        <script type="application/ld+json">{JSON.stringify(JSONLD_FAQ)}</script>
        <script type="application/ld+json">{JSON.stringify(JSONLD_BREADCRUMB)}</script>
      </Helmet>

      <article className="landing-warm min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <nav className="text-xs text-neutral-500 mb-6">
            <Link to="/" className="hover:text-neutral-800">Accueil</Link> · <Link to="/journal" className="hover:text-neutral-800">Journal</Link>
          </nav>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-neutral-900 leading-[1.05]">{TITLE}</h1>
          <p className="mt-5 text-lg text-neutral-600 leading-relaxed">
            Pourquoi le meilleur entrepreneur pour votre voisin n'est peut-être pas le meilleur pour vous.
          </p>

          <div className="mt-12 space-y-10 text-neutral-800 leading-[1.75]">
            <section>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Le modèle des 3 soumissions ne fonctionne pas</h2>
              <p>Comparer trois soumissions suppose que les trois entrepreneurs sont interchangeables. C'est faux. Un excellent professionnel peut être parfait pour un projet et complètement inadéquat pour un autre — trop loin, fully booké, mauvaise spécialisation, ne dessert pas les condos, ne parle pas votre langue, ne fait pas de moisissures, refuse le centre-ville de Montréal.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Compatibilité, pas popularité</h2>
              <p>UNPRO évalue plus de 50 critères de compatibilité avant chaque recommandation :</p>
              <ul className="mt-4 space-y-2 list-disc pl-5">
                <li><strong>Projet</strong> : catégorie, sous-type, complexité, permis requis</li>
                <li><strong>Budget</strong> : fourchette compatible avec le ticket moyen de l'entrepreneur</li>
                <li><strong>Région</strong> : territoire réellement desservi, exclusions incluses</li>
                <li><strong>Disponibilité</strong> : calendrier réel vs urgence du projet</li>
                <li><strong>Communication</strong> : langue, canal préféré (texto, courriel, appel)</li>
                <li><strong>Performance</strong> : score AIPP vérifié, avis, historique</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Home Passport et mémoire continue</h2>
              <p>Chaque conversation avec Alex enrichit votre profil de préférences à long terme : langue, animaux à la maison, style de communication, priorité (prix, qualité, rapidité, écologie), moment préféré pour les rendez-vous. Alex ne repose jamais les mêmes questions. Le système devient plus précis à chaque projet.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Ce que ça change concrètement</h2>
              <p>Vous ne recevez pas trois offres à comparer. Vous recevez <strong>une</strong> recommandation avec un score de compatibilité transparent — projet 98%, budget 94%, région 100%, disponibilité 92%, communication 95%, performance vérifiée. Vous prenez rendez-vous directement.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Aucune recommandation n'est identique</h2>
              <p>Votre voisin a peut-être choisi un excellent entrepreneur. Ce n'est pas nécessairement le vôtre. La bonne recommandation dépend de votre propriété, de votre projet, de votre budget, de vos préférences et de votre calendrier. UNPRO identifie cette combinaison unique — c'est tout ce qui compte.</p>
            </section>
          </div>

          <div className="mt-14 pt-8 border-t border-neutral-200">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:-translate-y-0.5 transition-transform duration-[420ms]"
            >
              Décrire mon projet à Alex
            </Link>
          </div>
        </div>
      </article>
    </MainLayout>
  );
}
