/**
 * UNPRO — Article éditorial
 * "Comment apparaître dans les résultats de recherche par l'IA en 2026? Le guide pour les entrepreneurs"
 * Audience : entrepreneurs et professionnels des services résidentiels au Québec.
 * SEO + AEO + GEO : Article + BreadcrumbList + FAQPage JSON-LD, bloc réponse extractible, HTML sémantique.
 */
import { useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Sparkles,
  Search,
  MessageSquareQuote,
  Bot,
  MapPin,
  ShieldCheck,
  CalendarCheck,
  Target,
  Network,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SectionArticleStructuredData from "@/components/articles/SectionArticleStructuredData";
import SectionArticleFAQSEO from "@/components/articles/SectionArticleFAQSEO";
import SectionArticleInternalLinksSEO from "@/components/articles/SectionArticleInternalLinksSEO";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/articles/apparaitre-recherche-ia-2026.jpg";

const SLUG = "comment-apparaitre-resultats-recherche-ia-2026-entrepreneur";
const PUBLISHED = "2026-08-22";
const CANONICAL = `https://unpro.ca/articles/${SLUG}`;

const H1 = "Comment apparaître dans les résultats de recherche par l'IA en 2026? Le guide pour les entrepreneurs";
const TITLE = "Comment apparaître dans les résultats de recherche par l'IA en 2026?";
const DESCRIPTION =
  "Entrepreneurs du Québec : découvrez comment le SEO, l'AEO, le GEO et les données structurées peuvent aider votre entreprise à être comprise et recommandée par l'IA en 2026.";

const ANSWER_BLOCK =
  "Pour apparaître davantage dans les recherches alimentées par l'IA en 2026, un entrepreneur doit rendre son entreprise facile à identifier, comprendre et vérifier : services précis, territoires desservis, expertise, réputation, qualifications, données cohérentes et contenu structuré. UNPRO organise ces informations afin de mieux connecter les entrepreneurs québécois aux propriétaires dont les projets correspondent réellement à leur expertise.";

const TOC = [
  { id: "recherche-change", label: "La recherche passe des liens aux réponses" },
  { id: "seo-aeo-geo", label: "SEO, AEO et GEO : trois logiques différentes" },
  { id: "penser-autrement", label: "Pourquoi penser autrement en 2026" },
  { id: "information-structuree", label: "Pourquoi l'information structurée change tout" },
  { id: "unpro-comprehension", label: "Comment UNPRO rend un entrepreneur compréhensible" },
  { id: "specialisation", label: "Votre métier et vos spécialisations" },
  { id: "services-precis", label: "Des services précis, pas des catégories floues" },
  { id: "territoire", label: "Votre vrai territoire desservi" },
  { id: "client-ideal", label: "Votre client et votre projet idéal" },
  { id: "confiance", label: "La confiance numérique" },
  { id: "disponibilite", label: "La disponibilité réelle" },
  { id: "meilleur-pour-ce-client", label: "Du « meilleur entrepreneur » au « meilleur pour ce client »" },
  { id: "rendez-vous-exclusifs", label: "Rendez-vous exclusifs plutôt que leads partagés" },
  { id: "ameliorer-decouvrabilite", label: "Comment améliorer votre découvrabilité" },
  { id: "petit-entrepreneur", label: "Et le petit entrepreneur sans marketing?" },
  { id: "identite-numerique", label: "Le profil comme identité numérique structurée" },
  { id: "graphe-connaissances", label: "Le graphe de connaissances de l'habitation" },
  { id: "futur-recherche-locale", label: "Le futur de la recherche locale au Québec" },
  { id: "limites", label: "Ce qu'UNPRO peut faire, et ce qu'il ne peut pas faire" },
  { id: "faq", label: "Questions fréquentes" },
];

const SEO_AEO_GEO = [
  {
    icon: Search,
    title: "SEO — Search Engine Optimization",
    subtitle: "Être trouvable",
    body:
      "Le référencement classique cherche à positionner une page dans une liste de résultats. L'objectif est le clic : le moteur propose des liens, la personne choisit.",
  },
  {
    icon: MessageSquareQuote,
    title: "AEO — Answer Engine Optimization",
    subtitle: "Être la réponse",
    body:
      "Les moteurs de réponse ne présentent plus dix liens : ils formulent une réponse. Pour être repris dans cette réponse, l'information doit être claire, factuelle, structurée et facile à extraire.",
  },
  {
    icon: Bot,
    title: "GEO — Generative Engine Optimization",
    subtitle: "Être recommandé",
    body:
      "Les systèmes génératifs synthétisent plusieurs sources et nomment parfois des entreprises. Ce qui compte alors n'est plus seulement une page, mais la cohérence de votre identité d'entreprise à travers l'ensemble des données disponibles.",
  },
];

const PROFILE_SIGNALS = [
  { icon: Target, label: "Métier et spécialisations réelles" },
  { icon: CheckCircle2, label: "Services précis, formulés comme un propriétaire les décrit" },
  { icon: MapPin, label: "Territoire desservi, ville par ville" },
  { icon: Sparkles, label: "Type de projet et de client recherché" },
  { icon: ShieldCheck, label: "Éléments de confiance et qualifications" },
  { icon: CalendarCheck, label: "Disponibilité et capacité du mois" },
];

const CHECKLIST = [
  "Utilisez partout le même nom légal ou commercial, la même adresse et le même numéro de téléphone.",
  "Décrivez vos services avec les mots des propriétaires, pas avec du vocabulaire interne.",
  "Nommez vos villes réellement desservies plutôt qu'une région vague.",
  "Précisez ce que vous ne faites pas : c'est aussi utile qu'une liste de services.",
  "Gardez vos qualifications à jour et vérifiables.",
  "Indiquez votre capacité réelle plutôt qu'une disponibilité théorique.",
  "Répondez rapidement : la vitesse de réponse est un signal de qualité mesurable.",
  "Documentez vos réalisations : type de bâtiment, problème, solution, territoire.",
];

const FAQS = [
  {
    question: "Est-ce qu'un entrepreneur peut vraiment apparaître dans les réponses générées par l'IA?",
    answer:
      "Aucune plateforme ne contrôle les réponses de ChatGPT, de Gemini ou des aperçus IA de Google. Ce qu'un entrepreneur peut faire, c'est rendre son entreprise plus facile à identifier, comprendre et vérifier : services précis, territoires desservis, qualifications, cohérence des données et contenu structuré. Ce travail améliore la découvrabilité générale, sans garantie de position.",
  },
  {
    question: "Quelle est la différence entre le SEO, l'AEO et le GEO?",
    answer:
      "Le SEO vise à être trouvable dans une liste de liens. L'AEO vise à être repris dans une réponse formulée par un moteur de réponse. Le GEO vise à être compris et cité par des systèmes génératifs qui synthétisent plusieurs sources. Les trois sont complémentaires : le SEO reste utile, mais il ne suffit plus seul.",
  },
  {
    question: "Est-ce que le SEO traditionnel est mort en 2026?",
    answer:
      "Non. Un site clair, rapide et bien structuré demeure une base. Ce qui change, c'est que la visibilité ne dépend plus uniquement du positionnement d'une page : elle dépend aussi de la qualité et de la cohérence des données qui décrivent votre entreprise.",
  },
  {
    question: "Pourquoi les données structurées comptent-elles autant pour un entrepreneur?",
    answer:
      "Un système intelligent ne devine pas. Il fonctionne mieux avec des faits explicites : quel métier, quels services, quelles villes, quelles qualifications, quelle disponibilité. Une information floue ou contradictoire réduit la capacité d'un système à vous associer au bon projet.",
  },
  {
    question: "Est-ce qu'UNPRO peut garantir une première position dans ChatGPT ou Google?",
    answer:
      "Non, et aucune entreprise honnête ne peut le garantir. UNPRO structure l'information des entrepreneurs québécois et améliore la découvrabilité et le pairage à l'intérieur de son propre écosystème, tout en construisant une couche de données lisible par les systèmes intelligents.",
  },
  {
    question: "Qu'est-ce qu'un rendez-vous exclusif chez UNPRO?",
    answer:
      "C'est une occasion résidentielle qualifiée attribuée à un seul professionnel compatible, après analyse du projet, du territoire, des spécialités et de la disponibilité. Le même projet n'est pas revendu à plusieurs entrepreneurs.",
  },
  {
    question: "Un petit entrepreneur sans département marketing peut-il en bénéficier?",
    answer:
      "Oui. La logique n'est pas de produire plus de contenu que les autres, mais de décrire correctement son entreprise. Un entrepreneur de trois personnes qui décrit précisément ses services, ses villes et ses spécialités devient plus facile à comprendre qu'une grande entreprise décrite de façon vague.",
  },
  {
    question: "Combien de temps faut-il pour voir un effet?",
    answer:
      "Il n'existe pas de délai garanti. La cohérence des données est un travail cumulatif : plus votre information est précise, à jour et constante, plus elle devient exploitable par les systèmes qui vous lisent.",
  },
  {
    question: "Faut-il payer pour être compris par l'IA?",
    answer:
      "Non. La qualité de votre information ne s'achète pas : elle se documente. Un profil complet, précis et vérifiable est la base, quel que soit le niveau de service choisi ensuite.",
  },
  {
    question: "Que doit faire un entrepreneur québécois en premier?",
    answer:
      "Compléter une description structurée de son entreprise : métier, spécialisations, services précis, villes desservies, projets recherchés, qualifications et disponibilité. C'est exactement ce que le profil UNPRO organise.",
  },
];

const INTERNAL_LINKS = [
  { url: "/entrepreneurs", anchor: "UNPRO pour les entrepreneurs" },
  { url: "/comment-fonctionne-ia", anchor: "Comment fonctionne la recommandation IA d'UNPRO" },
  { url: "/entrepreneur/garantie", anchor: "Rendez-vous garantis : comment ça fonctionne" },
  { url: "/entrepreneur/devis-personnalise", anchor: "Estimer votre potentiel de rendez-vous exclusifs" },
  { url: "/articles/moins-de-soumissions-plus-de-factures", anchor: "Moins de soumissions, plus de factures" },
  { url: "/articles/fournisseur-peinture-plus-contrats", anchor: "Comment un fournisseur de peinture a aidé ses entrepreneurs à décrocher plus de contrats" },
  { url: "/articles/badges-choix-consommateur-2026", anchor: "Les badges « Choix du consommateur » suffisent-ils encore en 2026?" },
  { url: "/pourquoi-pas-trois-soumissions", anchor: "Pourquoi la fin des 3 soumissions" },
];

export default function PageApparaitreRechercheIA2026() {
  const navigate = useNavigate();
  const fired = useRef<Set<string>>(new Set());

  const track = useCallback((ctaKey: string) => {
    if (fired.current.has(ctaKey)) return;
    fired.current.add(ctaKey);
    supabase
      .from("entrepreneur_cta_events")
      .insert({ visitor_id: crypto.randomUUID(), cta_key: ctaKey, page_section: SLUG })
      .then(() => {});
  }, []);

  useEffect(() => {
    track("article_ia2026_view");
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (max <= 0) return;
      const pct = (h.scrollTop / max) * 100;
      if (pct >= 50) track("article_ia2026_scroll_50");
      if (pct >= 90) track("article_ia2026_scroll_90");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [track]);

  const goProfile = (key: string) => {
    track(key);
    navigate("/entrepreneur/onboarding");
  };

  const goEntrepreneurs = () => {
    track("article_ia2026_pricing_click");
    navigate("/entrepreneurs");
  };

  return (
    <>
      <Helmet>
        <html lang="fr-CA" />
        <title>{TITLE} | UNPRO</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_CA" />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:image" content={`https://unpro.ca${heroImage}`} />
        <meta property="article:published_time" content={PUBLISHED} />
        <meta property="article:author" content="Équipe UNPRO" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={`https://unpro.ca${heroImage}`} />
      </Helmet>

      <SectionArticleStructuredData
        title={TITLE}
        description={DESCRIPTION}
        slug={SLUG}
        datePublished={PUBLISHED}
        dateModified={PUBLISHED}
        wordCount={2600}
        category="Visibilité et intelligence artificielle"
        h1={H1}
      />

      <article className="min-h-screen bg-background overflow-x-hidden">
        {/* HERO */}
        <header className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
          <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
            <nav className="text-xs text-muted-foreground mb-6" aria-label="Fil d'Ariane">
              <Link to="/" className="hover:text-foreground">Accueil</Link>
              <span className="mx-2">/</span>
              <Link to="/articles" className="hover:text-foreground">Articles</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Recherche par l'IA</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3 w-3" /> Analyse UNPRO
              </span>
              <span className="text-xs text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Lecture 12 min · Équipe UNPRO · 22 août 2026
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-bold text-foreground leading-tight font-display tracking-tight"
            >
              {H1}
            </motion.h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
              La recherche ne se limite plus à une liste de liens bleus. Elle devient une réponse, puis
              une recommandation. Voici ce que cela change concrètement pour un entrepreneur au Québec.
            </p>

            <img
              src={heroImage}
              width={1600}
              height={912}
              alt="Entrepreneur québécois devant une interface d'intelligence artificielle où plusieurs résultats convergent vers une seule recommandation"
              className="mt-8 w-full h-auto rounded-2xl border border-border/40 object-cover"
            />
          </div>
        </header>

        {/* BLOC RÉPONSE — AEO */}
        <section className="max-w-3xl mx-auto px-4 pt-10" aria-label="Réponse courte">
          <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
              La réponse courte
            </p>
            <p className="text-foreground leading-relaxed">{ANSWER_BLOCK}</p>
          </Card>
        </section>

        {/* TABLE DES MATIÈRES */}
        <nav className="max-w-3xl mx-auto px-4 py-8" aria-label="Table des matières">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Dans cet article</h2>
            <ol className="grid gap-1.5 sm:grid-cols-2 text-sm">
              {TOC.map((t, i) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {i + 1}. {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </Card>
        </nav>

        {/* 1 — LA RECHERCHE CHANGE */}
        <section id="recherche-change" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            La recherche passe des liens aux réponses
          </h2>
          <p className="text-foreground leading-relaxed">
            Pendant vingt ans, la question d'un entrepreneur était simple : « Est-ce que mon entreprise
            apparaît sur Google? » On tapait « couvreur Terrebonne », on obtenait une liste, on cliquait,
            on comparait.
          </p>
          <p className="text-foreground leading-relaxed">
            Aujourd'hui, un propriétaire ne cherche plus toujours une liste. Il pose une question complète :
            « J'ai de la glace au bord du toit chaque hiver et des taches au plafond de la chambre. C'est
            quoi le vrai problème, et qui devrait venir voir ça? »
          </p>
          <p className="text-foreground leading-relaxed">
            Ce n'est plus une requête de mots-clés. C'est une demande d'interprétation. Et la réponse
            attendue n'est plus dix liens : c'est une explication, puis une orientation.
          </p>
          <p className="text-foreground leading-relaxed">
            Pour un entrepreneur, le déplacement est majeur. Être présent dans une liste et être compris
            dans une réponse ne demandent pas le même travail.
          </p>
        </section>

        {/* 2 — SEO / AEO / GEO */}
        <section id="seo-aeo-geo" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            SEO, AEO et GEO : trois logiques différentes
          </h2>
          <p className="text-foreground leading-relaxed">
            Trois acronymes circulent depuis un an. Ils ne sont pas interchangeables.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {SEO_AEO_GEO.map((b) => (
              <Card key={b.title} className="p-5 space-y-2">
                <b.icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="text-base font-semibold text-foreground">{b.title}</h3>
                <p className="text-xs uppercase tracking-wider text-primary">{b.subtitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </Card>
            ))}
          </div>
          <p className="text-foreground leading-relaxed">
            Le SEO reste la fondation : un site clair et rapide demeure utile. Mais l'AEO et le GEO
            reposent sur autre chose que des pages. Ils reposent sur des faits vérifiables au sujet de
            votre entreprise.
          </p>
        </section>

        {/* 3 — PENSER AUTREMENT */}
        <section id="penser-autrement" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Pourquoi un entrepreneur doit penser autrement en 2026
          </h2>
          <p className="text-foreground leading-relaxed">
            L'ancienne stratégie était une course au volume : plus de pages, plus de mots-clés, plus
            d'annuaires, plus de demandes de soumission. Le résultat, pour beaucoup d'entrepreneurs
            québécois, a été prévisible : beaucoup d'appels, peu de projets réels, et le sentiment de
            travailler pour la plateforme plutôt que pour son entreprise.
          </p>
          <p className="text-foreground leading-relaxed">
            La logique des systèmes intelligents est inverse. Ils ne récompensent pas la quantité de
            présence : ils récompensent la clarté. Un système ne peut recommander que ce qu'il comprend.
          </p>
          <Card className="p-6 bg-muted/30">
            <p className="text-lg md:text-xl font-semibold text-foreground text-center">
              Avant : être vu le plus souvent possible.<br />
              Maintenant : être compris le plus précisément possible.
            </p>
          </Card>
        </section>

        {/* 4 — INFORMATION STRUCTURÉE */}
        <section id="information-structuree" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Pourquoi l'information structurée change tout
          </h2>
          <p className="text-foreground leading-relaxed">
            Prenons deux entrepreneurs. Le premier écrit : « Entreprise de rénovation générale, service
            professionnel, satisfaction garantie, grande région de Montréal. » Le second écrit :
            « Isolation de greniers par cellulose soufflée et étanchéité de l'enveloppe, maisons
            unifamiliales construites avant 1990, à Terrebonne, Mascouche, Repentigny et Laval. »
          </p>
          <p className="text-foreground leading-relaxed">
            Le premier texte est vide de faits. Le second contient un métier, une technique, un type de
            bâtiment, une époque de construction et un territoire. Pour un humain, la différence est de
            style. Pour un système, c'est la différence entre l'ambiguïté et l'exploitabilité.
          </p>
          <p className="text-foreground leading-relaxed">
            Une information structurée n'est pas du jargon technique. C'est simplement une information
            explicite, cohérente d'une source à l'autre, et vérifiable.
          </p>
        </section>

        {/* 5 — UNPRO */}
        <section id="unpro-comprehension" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Comment UNPRO aide un entrepreneur à devenir compréhensible
          </h2>
          <p className="text-foreground leading-relaxed">
            UNPRO est une plateforme québécoise d'intelligence résidentielle. Son rôle n'est pas de
            revendre des formulaires, mais d'organiser l'information : celle des propriétaires au sujet
            de leur maison, et celle des entrepreneurs au sujet de leur expertise.
          </p>
          <p className="text-foreground leading-relaxed">
            Concrètement, le profil UNPRO transforme une présentation d'entreprise en signaux exploitables.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {PROFILE_SIGNALS.map((s) => (
              <li key={s.label} className="flex items-start gap-3 rounded-xl border border-border/40 p-4">
                <s.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden />
                <span className="text-sm text-foreground leading-relaxed">{s.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 6 — SPÉCIALISATION */}
        <section id="specialisation" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Votre métier et vos spécialisations
          </h2>
          <p className="text-foreground leading-relaxed">
            « Rénovation générale » est une porte d'entrée, pas une identité. Un entrepreneur qui déclare
            tout faire devient difficile à associer à un besoin précis.
          </p>
          <p className="text-foreground leading-relaxed">
            À l'inverse, une spécialisation assumée agit comme un aimant. Ventilation et échangeurs d'air,
            isolation de l'enveloppe, toiture à faible pente, drain français, portes et fenêtres,
            revêtement extérieur : plus la spécialisation est nommée, plus le pairage devient précis.
          </p>
          <p className="text-foreground leading-relaxed">
            Se spécialiser dans les données ne veut pas dire refuser des projets. Cela veut dire indiquer
            clairement ce que vous faites le mieux.
          </p>
        </section>

        {/* 7 — SERVICES PRÉCIS */}
        <section id="services-precis" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Des services précis, pas des catégories floues
          </h2>
          <p className="text-foreground leading-relaxed">
            Un propriétaire ne cherche presque jamais le nom technique de votre service. Il décrit un
            symptôme : « ça sent l'humidité au sous-sol », « la fenêtre coule au printemps », « il fait
            froid dans la chambre au-dessus du garage ».
          </p>
          <p className="text-foreground leading-relaxed">
            Décrire vos services dans le vocabulaire du propriétaire, tout en conservant la précision
            technique, permet de faire le pont entre un symptôme et une compétence. C'est exactement ce
            qu'un moteur de réponse doit réussir pour vous nommer.
          </p>
        </section>

        {/* 8 — TERRITOIRE */}
        <section id="territoire" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Votre vrai territoire desservi
          </h2>
          <p className="text-foreground leading-relaxed">
            « Grand Montréal » ne veut rien dire pour un propriétaire de Sainte-Adèle. Un territoire réel
            se nomme : Montréal, Laval, Terrebonne, Repentigny, Mascouche, la Rive-Nord, la Rive-Sud, les
            Laurentides, Lanaudière.
          </p>
          <p className="text-foreground leading-relaxed">
            Un territoire honnête protège aussi votre rentabilité. Deux heures de route pour une visite
            non rentable coûtent plus cher qu'un projet refusé au bon moment. Déclarer un territoire
            précis améliore la qualité des occasions qui vous parviennent.
          </p>
        </section>

        {/* 9 — CLIENT IDÉAL */}
        <section id="client-ideal" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Votre client et votre projet idéal
          </h2>
          <p className="text-foreground leading-relaxed">
            Deux entreprises du même métier ne veulent pas les mêmes chantiers. L'une vise les
            interventions rapides et récurrentes; l'autre, les projets planifiés de plus grande envergure.
          </p>
          <p className="text-foreground leading-relaxed">
            Type de bâtiment, ampleur du projet, échéancier, saison, copropriété ou unifamiliale : ces
            préférences ne sont pas des détails administratifs. Ce sont les critères qui séparent un bon
            rendez-vous d'une perte de temps.
          </p>
        </section>

        {/* CTA CONTEXTUEL — ~40 % */}
        <section className="max-w-3xl mx-auto px-4 py-8">
          <Card className="p-8 md:p-10 space-y-4 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              Est-ce que l'IA comprend vraiment votre entreprise?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Complétez votre profil UNPRO : services, territoires, spécialités et projets recherchés.
              Transformez votre expertise en données que les systèmes intelligents peuvent mieux comprendre.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" className="gap-2" onClick={() => goProfile("article_ia2026_profile_cta")}>
                Créer ou réclamer mon profil <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </section>

        {/* 10 — CONFIANCE */}
        <section id="confiance" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            La confiance numérique
          </h2>
          <p className="text-foreground leading-relaxed">
            La confiance ne se déclare pas, elle se documente. Un nom d'entreprise identique partout, des
            coordonnées cohérentes, des qualifications à jour et une information qui ne se contredit pas
            d'une source à l'autre : ce sont des signaux simples, et ils comptent.
          </p>
          <p className="text-foreground leading-relaxed">
            À l'inverse, trois adresses différentes, deux numéros de téléphone et une raison sociale qui
            varie selon les plateformes créent du bruit. Un système prudent hésite devant le bruit.
          </p>
        </section>

        {/* 11 — DISPONIBILITÉ */}
        <section id="disponibilite" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            La disponibilité réelle
          </h2>
          <p className="text-foreground leading-relaxed">
            Le meilleur entrepreneur pour un projet n'est utile que s'il est disponible. Une capacité
            déclarée honnêtement — nombre de projets par mois, délais réalistes, périodes chargées —
            améliore la pertinence des occasions reçues et réduit les rendez-vous manqués.
          </p>
        </section>

        {/* 12 — MEILLEUR POUR CE CLIENT */}
        <section id="meilleur-pour-ce-client" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Du « meilleur entrepreneur » au « meilleur entrepreneur pour ce client »
          </h2>
          <p className="text-foreground leading-relaxed">
            La question « qui est le meilleur couvreur au Québec? » n'a pas de réponse utile. La question
            « qui est le bon couvreur pour une toiture à faible pente, à Repentigny, avec une infiltration
            active, un budget défini et une disponibilité en septembre? » en a une.
          </p>
          <p className="text-foreground leading-relaxed">
            C'est ce déplacement que les systèmes intelligents rendent possible. La visibilité devient
            contextuelle. Vous n'avez pas besoin d'être premier partout : vous devez être le bon choix
            évident dans les situations qui correspondent à votre expertise.
          </p>
        </section>

        {/* 13 — RENDEZ-VOUS EXCLUSIFS */}
        <section id="rendez-vous-exclusifs" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Rendez-vous exclusifs plutôt que leads partagés
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5 space-y-2 border-destructive/30">
              <XCircle className="h-5 w-5 text-destructive" aria-hidden />
              <h3 className="font-semibold text-foreground">Le lead partagé</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Un même formulaire est envoyé à plusieurs entrepreneurs. La conversation commence par une
                course au rappel, puis par une comparaison de prix. Le travail de vente est répété quatre
                fois pour un seul contrat.
              </p>
            </Card>
            <Card className="p-5 space-y-2 border-primary/30">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="font-semibold text-foreground">Le rendez-vous exclusif</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Un projet analysé est attribué à un seul professionnel compatible. La conversation commence
                par le problème du propriétaire, pas par une négociation.
              </p>
            </Card>
          </div>
          <p className="text-foreground leading-relaxed">
            C'est la même logique que celle des moteurs de réponse : une bonne réponse, pas une liste de
            possibilités à trier.
          </p>
        </section>

        {/* 14 — AMÉLIORER LA DÉCOUVRABILITÉ */}
        <section id="ameliorer-decouvrabilite" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Comment un entrepreneur peut améliorer sa découvrabilité
          </h2>
          <p className="text-foreground leading-relaxed">
            Aucune de ces actions ne garantit une position. Toutes améliorent la capacité d'un système à
            vous comprendre.
          </p>
          <ul className="space-y-2">
            {CHECKLIST.map((c) => (
              <li key={c} className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden />
                <span className="text-foreground leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 15 — PETIT ENTREPRENEUR */}
        <section id="petit-entrepreneur" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Et le petit entrepreneur sans département marketing?
          </h2>
          <p className="text-foreground leading-relaxed">
            Un entrepreneur en ventilation de Mascouche, trois employés, aucun budget publicitaire, un site
            web de quatre pages. Sur le terrain, sa réputation est excellente. En ligne, il est presque
            invisible.
          </p>
          <p className="text-foreground leading-relaxed">
            Il ne gagnera jamais une guerre de contenu contre une grande entreprise. Mais il peut gagner
            la clarté. En décrivant ses spécialités réelles — échangeurs d'air, équilibrage, maisons
            certifiées Novoclimat — ses villes réelles et ses projets recherchés, il devient précisément
            identifiable pour les demandes qui lui correspondent.
          </p>
          <p className="text-foreground leading-relaxed">
            La bonne nouvelle pour les petites équipes : la précision coûte du temps, pas de l'argent.
          </p>
        </section>

        {/* 16 — IDENTITÉ NUMÉRIQUE */}
        <section id="identite-numerique" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le profil comme identité numérique structurée
          </h2>
          <p className="text-foreground leading-relaxed">
            Une page « À propos » raconte. Un profil structuré déclare. La différence est que le second
            peut être lu, comparé et relié par un système.
          </p>
          <p className="text-foreground leading-relaxed">
            Un profil UNPRO complété devient l'identité de référence de votre entreprise : métier,
            spécialités, services, territoires, préférences de projet, éléments de confiance et
            disponibilité, réunis au même endroit et exprimés de la même façon.
          </p>
        </section>

        {/* 17 — GRAPHE */}
        <section id="graphe-connaissances" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le graphe de connaissances de l'habitation québécoise
          </h2>
          <div className="flex items-start gap-3">
            <Network className="h-5 w-5 text-primary mt-1 shrink-0" aria-hidden />
            <p className="text-foreground leading-relaxed">
              Un graphe de connaissances relie des entités entre elles : un symptôme est relié à un
              problème, un problème à une solution, une solution à un métier, un métier à des
              professionnels, un professionnel à un territoire et à une disponibilité.
            </p>
          </div>
          <p className="text-foreground leading-relaxed">
            C'est cette structure qui permet de passer d'une phrase de propriétaire — « il y a de la glace
            sur le bord de mon toit » — à une orientation utile, plutôt qu'à une simple liste d'entreprises.
          </p>
          <p className="text-foreground leading-relaxed">
            Chaque entrepreneur qui décrit correctement son entreprise devient un nœud clair dans ce
            graphe. Chaque description vague reste un nœud flou.
          </p>
        </section>

        {/* 18 — FUTUR */}
        <section id="futur-recherche-locale" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le futur de la recherche locale au Québec
          </h2>
          <p className="text-foreground leading-relaxed">
            La direction est déjà visible : moins de listes, plus de réponses; moins de comparaison
            manuelle, plus d'orientation; moins de mots-clés, plus de contexte.
          </p>
          <p className="text-foreground leading-relaxed">
            Dans ce contexte, l'avantage ne va pas à celui qui crie le plus fort. Il va à celui dont
            l'information est la plus claire, la plus à jour et la plus cohérente. C'est une bonne
            nouvelle pour les entrepreneurs sérieux du Québec.
          </p>
        </section>

        {/* 19 — LIMITES / VÉRACITÉ */}
        <section id="limites" className="max-w-3xl mx-auto px-4 py-8 space-y-4 scroll-mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Ce qu'UNPRO peut faire, et ce qu'il ne peut pas faire
          </h2>
          <Card className="p-6 border-l-4 border-l-amber-500 bg-amber-500/5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" aria-hidden />
              <p className="text-foreground leading-relaxed font-medium">
                UNPRO ne contrôle pas les résultats de ChatGPT, de Gemini, de Perplexity ni les aperçus IA
                de Google. Aucune plateforme ne peut garantir un classement dans un système externe. Toute
                promesse de « première position dans l'IA » devrait être considérée avec méfiance.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Ce qu'UNPRO fait : structurer l'information des entrepreneurs québécois, améliorer la
              compréhension de leur expertise, augmenter leur découvrabilité et faciliter la
              recommandation à l'intérieur de son propre écosystème, tout en construisant une couche de
              données lisible par les systèmes intelligents.
            </p>
          </Card>
        </section>

        {/* CTA FINAL */}
        <section className="max-w-3xl mx-auto px-4 py-8">
          <Card className="p-8 md:p-12 space-y-6 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
            <p className="text-foreground leading-relaxed">
              En 2026, la question n'est plus seulement : <em>Est-ce que votre entreprise apparaît sur Google?</em>
            </p>
            <p className="text-muted-foreground">La vraie question est :</p>
            <p className="text-2xl md:text-3xl font-bold text-primary font-display leading-tight">
              Est-ce que l'IA sait quand elle devrait vous recommander?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" className="gap-2" onClick={() => goProfile("article_ia2026_profile_cta_final")}>
                Créer mon profil UNPRO <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={goEntrepreneurs}>
                Découvrir UNPRO pour entrepreneurs
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              UNPRO — Un propriétaire. Un projet. Un pro.
            </p>
          </Card>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto px-4 py-8 scroll-mt-20">
          <SectionArticleFAQSEO faqs={FAQS} />
        </section>

        {/* MAILLAGE INTERNE */}
        <section className="max-w-3xl mx-auto px-4 py-8 pb-20 border-t border-border/40">
          <SectionArticleInternalLinksSEO links={INTERNAL_LINKS} />
        </section>
      </article>
    </>
  );
}
