/**
 * PageIaMaisonHub — Parent of the /ia-maison SEO cluster.
 *
 * Defines the category "L'intelligence artificielle pour votre maison" and
 * links to every child page so crawlers (Google, Gemini, Perplexity, ChatGPT,
 * Claude, Google-Extended) consolidate the cluster into a coherent topic.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { IA_MAISON_CLUSTER } from "@/data/iaMaisonCluster";
import EntityDefinitionBlock from "@/components/home-intelligence/EntityDefinitionBlock";

const BASE = "https://unpro.ca";
const URL = `${BASE}/ia-maison`;
const TITLE = "IA Maison — L'intelligence artificielle pour votre propriété | UNPRO";
const DESC =
  "Identifier les problèmes, comprendre les risques, estimer les coûts et trouver la bonne solution pour votre propriété au Québec. UNPRO est la plateforme de Passeport Maison québécoise.";

export default function PageIaMaisonHub() {
  const { openAlex } = useAlexVoice();

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESC,
    url: URL,
    inLanguage: "fr-CA",
    isPartOf: { "@type": "WebSite", name: "UNPRO", url: BASE },
    hasPart: IA_MAISON_CLUSTER.map((a) => ({
      "@type": "Article",
      headline: a.question,
      url: `${BASE}/${a.slug}`,
      about: { "@type": "Thing", name: a.primaryEntity },
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: IA_MAISON_CLUSTER.slice(0, 6).map((a) => ({
      "@type": "Question",
      name: a.question,
      acceptedAnswer: { "@type": "Answer", text: a.shortAnswer },
    })),
  };

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(collectionSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="unicorn-theme min-h-screen pb-24">
        <header className="px-4 pt-10 pb-6 max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#3B82F6] mb-3">
            UNPRO · Home Intelligence
          </p>
          <h1
            className="font-extrabold text-[30px] sm:text-[42px] leading-[1.02] tracking-[-0.035em] mb-4"
            style={{ color: "#0B1220" }}
          >
            L'intelligence artificielle pour votre maison.
          </h1>
          <p className="text-[15px] leading-relaxed mx-auto max-w-[44ch]" style={{ color: "#475467" }}>
            Identifier les problèmes, comprendre les risques et prendre de meilleures décisions
            pour votre propriété.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => openAlex("home_intent")}
              className="rounded-2xl px-6 py-4 text-white font-semibold text-[15px]"
              style={{
                background: "linear-gradient(135deg, #2563FF, #3B82F6)",
                boxShadow: "0 10px 24px -8px rgba(37,99,255,0.55)",
              }}
            >
              Analyser ma situation
            </button>
          </div>
        </header>

        <section className="px-4 max-w-5xl mx-auto">
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {IA_MAISON_CLUSTER.map((a) => (
              <li key={a.slug}>
                <Link
                  to={`/${a.slug}`}
                  className="block uc-glass-strong p-5 h-full transition-transform hover:-translate-y-0.5"
                  style={{ borderRadius: 24, color: "#0B1220" }}
                >
                  <h2 className="font-bold text-[15.5px] leading-snug mb-2">{a.question}</h2>
                  <p className="text-[13px]" style={{ color: "#475467" }}>{a.shortAnswer}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <EntityDefinitionBlock />
      </div>
    </>
  );
}
