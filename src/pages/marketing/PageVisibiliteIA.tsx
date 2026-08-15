/**
 * UNPRO — /visibilite-ia-entrepreneurs
 * Landing SEO/AEO/GEO : agence de visibilité IA pour entrepreneurs au Québec.
 * Aucune donnée inventée — aucun témoignage, score, résultat ou garantie.
 */
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import AiVisibilityLeadForm from "@/features/aiVisibilityLanding/AiVisibilityLeadForm";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Phone, Sparkles, MapPin, Wrench, Building2, ShieldCheck, Award, Layers,
  Search, Bot, ArrowRight,
} from "lucide-react";

const CANONICAL = "https://unpro.ca/visibilite-ia-entrepreneurs";
const PHONE_TEL = "tel:+15142499522";

const SIGNALS = [
  { icon: Wrench, label: "Services offerts" },
  { icon: MapPin, label: "Villes desservies" },
  { icon: Building2, label: "Types de projets recherchés" },
  { icon: Award, label: "Expérience et spécialisations" },
  { icon: ShieldCheck, label: "Preuves de confiance" },
  { icon: Layers, label: "Différences face aux concurrents" },
];

const SERVICES = [
  "Analyse de votre présence actuelle dans les réponses IA",
  "Création ou optimisation de votre profil UNPRO",
  "Clarification de vos services, spécialités et territoires",
  "Optimisation SEO, AEO et GEO de votre site",
  "Données structurées pour les moteurs et assistants IA",
  "Contenus, FAQ et preuves de confiance",
  "Suivi de la visibilité et des mentions observables",
];

const FAQ = [
  {
    q: "Pouvez-vous garantir que ChatGPT recommandera mon entreprise?",
    a: "Aucune agence sérieuse ne peut contrôler les réponses d'une intelligence artificielle. UNPRO peut toutefois améliorer la qualité, la cohérence et l'accessibilité des informations utilisées pour comprendre votre entreprise.",
  },
  {
    q: "Dois-je refaire mon site Web?",
    a: "Pas nécessairement. Nous commençons par analyser ce qui existe déjà. Dans plusieurs cas, des corrections ciblées, des données structurées et de meilleurs contenus peuvent suffire.",
  },
  {
    q: "Est-ce différent du SEO?",
    a: "Oui, mais les deux approches sont complémentaires. Le SEO aide votre entreprise à être trouvée dans les résultats de recherche. L'AEO et le GEO l'aident à être comprise, citée et potentiellement recommandée dans les réponses générées par l'IA.",
  },
  {
    q: "Est-ce réservé aux grandes entreprises?",
    a: "Non. Une entreprise locale bien documentée peut être particulièrement pertinente lorsque sa spécialité, son territoire et ses preuves de confiance sont clairement établis.",
  },
  {
    q: "Quelles plateformes sont concernées?",
    a: "La stratégie peut notamment améliorer la lisibilité de votre entreprise pour les moteurs de recherche et les assistants comme ChatGPT, Gemini, Perplexity et les expériences de recherche alimentées par l'IA. Chaque plateforme demeure toutefois indépendante.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://unpro.ca/#organization",
      name: "UNPRO",
      url: "https://unpro.ca",
      telephone: "+1-514-249-9522",
      areaServed: "CA-QC",
    },
    {
      "@type": "WebPage",
      "@id": `${CANONICAL}#webpage`,
      url: CANONICAL,
      name: "Agence de visibilité IA pour entrepreneurs au Québec | UNPRO",
      inLanguage: "fr-CA",
      isPartOf: { "@id": "https://unpro.ca/#organization" },
    },
    {
      "@type": "Service",
      "@id": `${CANONICAL}#service`,
      name: "Visibilité IA (SEO, AEO, GEO) pour entrepreneurs",
      serviceType: "Optimisation de la visibilité dans les moteurs de recherche et les assistants IA",
      provider: { "@id": "https://unpro.ca/#organization" },
      areaServed: { "@type": "AdministrativeArea", name: "Québec, Canada" },
      url: CANONICAL,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca/" },
        { "@type": "ListItem", position: 2, name: "Entrepreneurs", item: "https://unpro.ca/entrepreneurs" },
        { "@type": "ListItem", position: 3, name: "Visibilité IA", item: CANONICAL },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

function trackCall(position: string) {
  logFunnelEvent({ event_type: "ai_visibility_call_click", metadata: { position } });
}

export default function PageVisibiliteIA() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    logFunnelEvent({
      event_type: "ai_visibility_page_view",
      metadata: {
        utm_source: p.get("utm_source") || "",
        utm_medium: p.get("utm_medium") || "",
        utm_campaign: p.get("utm_campaign") || "",
        referrer: document.referrer || "",
      },
    });
  }, []);

  return (
    <MainLayout>
      <SeoHead
        title="Agence de visibilité IA pour entrepreneurs au Québec | UNPRO"
        description="Faites comprendre et découvrir votre entreprise par ChatGPT, Gemini et les autres moteurs IA. Analyse SEO, AEO et GEO pour entrepreneurs. Appelez UNPRO au 514 249-9522."
        canonical={CANONICAL}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="landing-warm pb-28 md:pb-0">
        {/* HERO */}
        <section className="px-5 pt-8 pb-8 sm:pt-14 md:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Visibilité IA pour entrepreneurs
            </span>

            <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Soyez recommandé par l'IA, pas seulement trouvé sur Google
            </h1>

            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              De plus en plus de propriétaires demandent directement à ChatGPT, Gemini et aux autres
              assistants IA quel entrepreneur choisir. UNPRO aide votre entreprise à devenir plus
              facile à comprendre, à vérifier et à recommander.
            </p>

            <p className="mt-3 text-sm font-medium text-foreground">Pas besoin de remplacer votre site Web.</p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <a
                href="#analyse-ia"
                onClick={() => logFunnelEvent({ event_type: "ai_visibility_cta_hero" })}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5"
              >
                Analyser ma visibilité IA
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={PHONE_TEL}
                onClick={() => trackCall("hero")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 font-semibold text-foreground transition hover:-translate-y-0.5"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Appeler le (514) 249-9522
              </a>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Analyse adaptée à vos services, votre territoire et vos objectifs de croissance.
            </p>
          </div>
        </section>

        {/* PROBLÈME */}
        <section className="px-5 py-6 md:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Le référencement traditionnel ne suffit plus
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Le SEO aide votre entreprise à apparaître dans une liste de résultats. Le référencement
              IA — aussi appelé AEO ou GEO — vise un autre objectif : donner aux intelligences
              artificielles des informations suffisamment claires, cohérentes et crédibles pour
              qu'elles puissent considérer votre entreprise lorsqu'elles formulent une recommandation.
            </p>

            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SIGNALS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4">
                  <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 rounded-2xl border-l-4 border-primary bg-primary/5 px-5 py-4 text-base font-medium text-foreground">
              Si ces informations sont absentes, contradictoires ou difficiles à vérifier, l'IA peut
              ignorer votre entreprise, même si vous faites un excellent travail.
            </p>
          </div>
        </section>

        {/* SOLUTION */}
        <section className="px-5 py-6 md:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              UNPRO bâtit votre présence pour l'ère de l'IA
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Nous analysons la façon dont votre entreprise est comprise en ligne, puis nous
              structurons les informations nécessaires pour améliorer sa découvrabilité auprès des
              moteurs de recherche et des assistants IA.
            </p>

            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <li key={s} className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-4">
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm text-foreground">{s}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-base font-medium text-foreground">
              L'objectif n'est plus seulement d'obtenir des clics. Il est de devenir une entreprise
              que l'IA peut comprendre, citer et potentiellement recommander.
            </p>
          </div>
        </section>

        {/* COMPARAISON */}
        <section className="px-5 py-6 md:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              SEO, AEO et GEO : des approches complémentaires
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Search className="h-5 w-5 text-primary" aria-hidden="true" /> SEO traditionnel
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Apparaître dans les résultats</li>
                  <li>Générer des visites</li>
                  <li>Optimiser les pages et mots-clés</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Bot className="h-5 w-5 text-primary" aria-hidden="true" /> AEO et GEO
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Être compris par les assistants IA</li>
                  <li>Répondre précisément aux questions des clients</li>
                  <li>Structurer les services, territoires, entités et preuves</li>
                  <li>Augmenter les possibilités d'être cité ou recommandé</li>
                </ul>
              </div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Le SEO demeure essentiel. L'AEO et le GEO s'ajoutent à votre référencement actuel.
            </p>
          </div>
        </section>

        {/* FORMULAIRE */}
        <section id="analyse-ia" className="scroll-mt-24 px-5 py-6 md:py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Découvrez comment l'IA comprend votre entreprise
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Remplissez ce court formulaire. Un spécialiste UNPRO communiquera avec vous pour
              comprendre votre situation et identifier les priorités les plus importantes.
            </p>
            <div className="mt-8">
              <AiVisibilityLeadForm />
            </div>
          </div>
        </section>

        {/* PLAN PERSONNALISÉ */}
        <section className="px-5 py-6 md:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Une stratégie adaptée à votre entreprise
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Il n'existe pas un forfait identique pour tous les entrepreneurs. UNPRO prépare un plan
              selon vos services, votre territoire, la concurrence locale et vos objectifs de croissance.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {["Services", "Territoire", "Concurrence", "Objectifs", "Niveau de développement recherché"].map((t) => (
                <li key={t} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-base text-muted-foreground">
              Vous conservez votre site Web, votre image de marque et vos outils actuels. UNPRO ajoute
              la couche de clarté, de structure et de crédibilité dont les systèmes d'intelligence
              artificielle ont besoin.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-5 py-6 md:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Questions fréquentes
            </h2>
            <Accordion type="single" collapsible className="mt-6">
              {FAQ.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-base font-semibold text-foreground">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="px-5 py-6 md:py-16">
          <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Préparez votre entreprise avant que vos concurrents le fassent
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              La prochaine génération de clients ne comparera pas toujours dix sites Web. Elle
              demandera à l'IA de lui indiquer les options les plus pertinentes.
            </p>
            <p className="mt-4 text-lg font-semibold text-foreground">
              Faites en sorte que votre entreprise puisse faire partie de la réponse.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <a
                href="#analyse-ia"
                onClick={() => logFunnelEvent({ event_type: "ai_visibility_cta_final" })}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground"
              >
                Demander mon analyse IA
              </a>
              <a
                href={PHONE_TEL}
                onClick={() => trackCall("final")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-7 py-3.5 font-semibold text-foreground"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Appeler le (514) 249-9522
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* CTA fixe mobile — porté dans document.body pour échapper aux conteneurs clippés */}
      {createPortal(
        <div className="fixed inset-x-3 bottom-[calc(var(--bottom-dock-height,88px)+env(safe-area-inset-bottom))] z-30 flex gap-2 md:hidden">
          <a
            href={PHONE_TEL}
            onClick={() => trackCall("sticky_mobile")}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold text-foreground shadow-lg"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Appeler UNPRO
          </a>
          <a
            href="#analyse-ia"
            onClick={() => logFunnelEvent({ event_type: "ai_visibility_cta_hero", metadata: { position: "sticky_mobile" } })}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg"
          >
            Analyse IA
          </a>
        </div>,
        document.body,
      )}
    </MainLayout>
  );
}
