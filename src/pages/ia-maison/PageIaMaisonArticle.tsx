/**
 * PageIaMaisonArticle — Shared template for every /ia-maison child page.
 *
 * Drives content from src/data/iaMaisonCluster.ts (deterministic, no LLM at
 * render time) so Google, Gemini, Perplexity, ChatGPT, Claude and
 * Google-Extended index a stable answer.
 */
import { useParams, Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { getArticleBySlug, getSiblings } from "@/data/iaMaisonCluster";
import EntityDefinitionBlock from "@/components/home-intelligence/EntityDefinitionBlock";

const BASE = "https://unpro.ca";

interface Props {
  slug?: string;
}

export default function PageIaMaisonArticle({ slug: slugProp }: Props) {
  const params = useParams();
  const slug = slugProp ?? params.slug ?? "";
  // When mounted on a literal route, the slug matches the path segment after `/`.
  // Each child route in router.tsx passes the literal slug as a prop.
  const article = getArticleBySlug(slug);
  const { openAlex } = useAlexVoice();

  if (!article) return <Navigate to="/ia-maison" replace />;

  const canonical = `${BASE}/${article.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.question,
    description: article.shortAnswer,
    inLanguage: "fr-CA",
    mainEntityOfPage: canonical,
    about: { "@type": "Thing", name: article.primaryEntity },
    author: { "@type": "Organization", name: "UNPRO" },
    publisher: {
      "@type": "Organization",
      name: "UNPRO",
      url: BASE,
      logo: { "@type": "ImageObject", url: `${BASE}/__l5e/assets-v1/a3c1d0e8-a6dd-413f-acf4-7ac488a303e0/unpro-logo-clean.png` },
    },
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: BASE },
      { "@type": "ListItem", position: 2, name: "IA Maison", item: `${BASE}/ia-maison` },
      { "@type": "ListItem", position: 3, name: article.question, item: canonical },
    ],
  };

  const siblings = getSiblings(article.slug, 3);

  return (
    <>
      <Helmet>
        <title>{article.question} | UNPRO</title>
        <meta name="description" content={article.shortAnswer} />
        <meta name="keywords" content={article.keywords.join(", ")} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.question} />
        <meta property="og:description" content={article.shortAnswer} />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="unicorn-theme min-h-screen pb-24">
        <nav aria-label="Fil d'Ariane" className="px-4 pt-6 max-w-3xl mx-auto text-[12px]" style={{ color: "#475467" }}>
          <Link to="/" className="hover:underline">Accueil</Link>
          {" / "}
          <Link to="/ia-maison" className="hover:underline">IA Maison</Link>
        </nav>

        <article className="px-4 pt-4 max-w-3xl mx-auto">
          <h1
            className="font-extrabold text-[28px] sm:text-[36px] leading-[1.05] tracking-[-0.035em] mb-4"
            style={{ color: "#0B1220" }}
          >
            {article.question}
          </h1>
          <p className="text-[16px] leading-relaxed mb-6" style={{ color: "#1F2937" }}>
            <strong>{article.shortAnswer}</strong>
          </p>

          <div
            className="prose prose-slate max-w-none text-[15px] leading-relaxed [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:mt-7 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
            style={{ color: "#1F2937" }}
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => openAlex("home_intent", article.question)}
              className="rounded-2xl px-6 py-4 text-white font-semibold text-[15px] transition-transform"
              style={{
                background: "linear-gradient(135deg, #2563FF, #3B82F6)",
                boxShadow: "0 10px 24px -8px rgba(37,99,255,0.55)",
              }}
            >
              Analyser ma situation
            </button>
            <Link
              to="/ia-maison"
              className="rounded-2xl px-6 py-4 text-center font-semibold text-[15px] uc-glass-strong"
              style={{ color: "#0B1220" }}
            >
              Voir toutes les capacités
            </Link>
          </div>

          <section className="mt-12">
            <h2 className="font-bold text-[20px] mb-3" style={{ color: "#0B1220" }}>
              Questions fréquentes
            </h2>
            <dl className="space-y-4">
              {article.faqs.map((f) => (
                <div key={f.q} className="uc-glass-strong p-4" style={{ borderRadius: 18 }}>
                  <dt className="font-semibold text-[15px] mb-1" style={{ color: "#0B1220" }}>{f.q}</dt>
                  <dd className="text-[14px]" style={{ color: "#475467" }}>{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-10">
            <h2 className="font-bold text-[18px] mb-3" style={{ color: "#0B1220" }}>
              À explorer aussi
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    to={`/${s.slug}`}
                    className="block uc-glass-strong p-4 transition-transform hover:-translate-y-0.5"
                    style={{ borderRadius: 18, color: "#0B1220" }}
                  >
                    <span className="text-[13.5px] font-semibold">{s.question}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </article>

        <EntityDefinitionBlock />
      </div>
    </>
  );
}
