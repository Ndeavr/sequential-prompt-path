/**
 * UNPRO — Article éditorial
 * "Comment un fournisseur de peinture a augmenté ses ventes en aidant ses entrepreneurs à décrocher plus de contrats"
 * Audience : fabricants, distributeurs, fournisseurs de peinture et entrepreneurs résidentiels au Québec.
 * AEO-ready (Article + BreadcrumbList + FAQPage JSON-LD).
 */
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  Clock,
  Sparkles,
  TrendingUp,
  Store,
  PaintBucket,
  Handshake,
  RotateCcw,
  Target,
  CheckCircle2,
  XCircle,
  Lightbulb,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SectionArticleStructuredData from "@/components/articles/SectionArticleStructuredData";
import SectionArticleFAQSEO from "@/components/articles/SectionArticleFAQSEO";
import SectionArticleInternalLinksSEO from "@/components/articles/SectionArticleInternalLinksSEO";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/articles/fournisseur-peinture-plus-contrats.jpg";

const SLUG = "fournisseur-peinture-plus-contrats";
const PUBLISHED = "2026-08-19";

const TITLE = "Comment un fournisseur de peinture a augmenté ses ventes en aidant ses entrepreneurs à décrocher plus de contrats";
const H1 = TITLE;
const DESCRIPTION =
  "Un fournisseur de peinture a transformé sa relation avec ses entrepreneurs en les aidant à obtenir plus de contrats résidentiels avec UNPRO. Voici la mécanique.";

const FAQS = [
  {
    question: "Pourquoi un fournisseur de peinture devrait-il aider ses entrepreneurs à vendre plus?",
    answer:
      "Parce que le volume de peinture acheté dépend directement du nombre de chantiers réalisés. Aider un entrepreneur à obtenir plus de contrats crée plus de demande pour les produits du fournisseur, tout en renforçant la fidélité commerciale.",
  },
  {
    question: "Quelle est la différence entre une promotion et un partenariat UNPRO?",
    answer:
      "Une promotion cherche à capter une plus grande partie des dépenses existantes. Un partenariat UNPRO cherche à augmenter les dépenses en augmentant d'abord le chiffre d'affaires du client, en lui apportant des occasions de contrats qualifiés.",
  },
  {
    question: "Qu'est-ce qu'un rendez-vous exclusif UNPRO?",
    answer:
      "C'est une occasion résidentière qualifiée attribuée à un seul professionnel compatible, après analyse du projet, du territoire desservi, des spécialités et de la disponibilité. Le même projet n'est pas partagé avec plusieurs entrepreneurs.",
  },
  {
    question: "UNPRO peut-il fonctionner pour d'autres métiers que la peinture?",
    answer:
      "Oui. Le même principe s'applique à l'isolation, la toiture, la plomberie, l'électricité, le revêtement, les planchers, les portes et fenêtres, la ventilation et d'autres métiers résidentiels.",
  },
  {
    question: "Le fournisseur vend-il les données de propriétaires?",
    answer:
      "Non. UNPRO ne transfère pas un formulaire à plusieurs entrepreneurs. Le modèle consiste à identifier le meilleur match pour un projet et à créer un rendez-vous exclusif avec un professionnel compatible.",
  },
];

const INTERNAL_LINKS = [
  { url: "/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur", anchor: "Comment apparaître dans les résultats de recherche par l'IA en 2026" },
  { url: "/entrepreneurs", anchor: "UNPRO pour les entrepreneurs" },
  { url: "/entrepreneur/garantie", anchor: "Rendez-vous garantis : comment ça fonctionne" },
  { url: "/entrepreneur/devis-personnalise", anchor: "Votre potentiel de rendez-vous exclusifs" },
  { url: "/articles/moins-de-soumissions-plus-de-factures", anchor: "Moins de soumissions, plus de factures" },
  { url: "/pourquoi-pas-trois-soumissions", anchor: "Pourquoi la fin des 3 soumissions" },
  { url: "/comment-fonctionne-ia", anchor: "Comment fonctionne la recommandation IA" },
];

const VIRTUOUS_CYCLE = [
  { label: "Le fournisseur recrute de bons peintres", icon: Store },
  { label: "Les peintres complètent leur profil UNPRO", icon: Target },
  { label: "UNPRO génère des occasions compatibles", icon: Lightbulb },
  { label: "Les entrepreneurs obtiennent plus de chantiers", icon: PaintBucket },
  { label: "Ils achètent davantage de peinture", icon: TrendingUp },
  { label: "La relation avec le fournisseur se renforce", icon: Handshake },
];

const TRENDS = [
  "Peinture extérieure à Terrebonne",
  "Armoires de cuisine à Laval",
  "Peinture avant relocation à Montréal",
  "Restauration de boiseries dans certains quartiers",
  "Travaux rapides avant mise en vente",
];

const OTHER_TRADES = [
  "Isolation",
  "Toiture",
  "Plomberie",
  "Électricité",
  "Revêtement",
  "Planchers",
  "Pavé uni",
  "Portes et fenêtres",
  "Ventilation",
];

export default function PageFournisseurPeinturePlusContrats() {
  const navigate = useNavigate();

  const trackCta = useCallback((ctaKey: string) => {
    supabase
      .from("entrepreneur_cta_events")
      .insert({ visitor_id: crypto.randomUUID(), cta_key: ctaKey, page_section: SLUG })
      .then(() => {});
  }, []);

  const goOffer = () => {
    trackCta("article_fournisseur_devis_personnalise");
    navigate("/entrepreneur/devis-personnalise");
  };

  const goExclusive = () => {
    trackCta("article_fournisseur_garantie");
    navigate("/entrepreneur/garantie");
  };

  return (
    <>
      <Helmet>
        <title>{TITLE} | UNPRO</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`https://unpro.ca/articles/${SLUG}`} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://unpro.ca/articles/${SLUG}`} />
        <meta property="og:image" content={`https://unpro.ca${heroImage}`} />
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
        wordCount={1400}
        category="Fournisseurs / Entrepreneurs"
        h1={H1}
      />

      <article className="min-h-screen bg-background overflow-x-hidden">
        {/* HERO */}
        <section className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
          <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
            <nav className="text-xs text-muted-foreground mb-6" aria-label="Fil d'Ariane">
              <Link to="/" className="hover:text-foreground">Accueil</Link>
              <span className="mx-2">/</span>
              <Link to="/articles" className="hover:text-foreground">Articles</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Fournisseurs</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3 w-3" /> Analyse UNPRO
              </span>
              <span className="text-xs text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Lecture 10 min · Août 2026
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
              Pendant des années, ce fournisseur de peinture misait sur une formule classique : bons
              produits, conseils techniques, rabais de volume et service rapide. Puis il a changé une
              variable. Et tout le reste a suivi.
            </p>

            <img
              src={heroImage}
              width={1600}
              height={900}
              alt="Représentant d'un fournisseur de peinture serrant la main d'un entrepreneur-peintre professionnel au comptoir d'une quincaillerie, avec des pots de peinture et des échantillons de couleurs"
              className="mt-8 w-full h-auto rounded-2xl border border-border/40 object-cover"
            />
          </div>
        </section>

        {/* INTRO */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <p className="text-foreground leading-relaxed">
            Pendant des années, ce fournisseur de peinture misait sur une formule bien connue : bons
            produits, conseils techniques, rabais de volume et service rapide aux entrepreneurs.
          </p>
          <p className="text-foreground leading-relaxed">Le problème?</p>
          <p className="text-foreground leading-relaxed">
            Pour vendre davantage de peinture, il fallait que ses entrepreneurs aient davantage de
            chantiers.
          </p>
          <p className="text-foreground leading-relaxed">C'est là que la stratégie a changé.</p>
          <p className="text-foreground leading-relaxed">
            Au lieu de simplement chercher à vendre plus de gallons à ses clients existants, le
            fournisseur a commencé à les aider à gagner plus de contrats résidentiels grâce à UNPRO.
          </p>
          <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
            <p className="text-muted-foreground italic">Le résultat a créé un cercle beaucoup plus intéressant :</p>
            <p className="text-lg md:text-xl text-primary font-semibold mt-2">
              Plus de contrats → plus de chantiers → plus de peinture achetée → entrepreneurs plus fidèles au fournisseur.
            </p>
          </Card>
        </section>

        {/* PROBLÈME CACHÉ */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le problème caché des fournisseurs de peinture
          </h2>
          <p className="text-foreground leading-relaxed">
            Un entrepreneur-peintre peut être extrêmement fidèle à son fournisseur.
          </p>
          <p className="text-foreground leading-relaxed">
            Mais lorsqu'il traverse une période plus tranquille, cette fidélité ne crée pas de volume.
          </p>
          <p className="text-foreground leading-relaxed">
            S'il a 12 chantiers ce mois-ci, il achète pour 12 chantiers. S'il n'en a que 6, ses achats diminuent presque automatiquement.
          </p>
          <p className="text-foreground leading-relaxed">
            Les promotions peuvent déplacer une commande de quelques jours ou influencer le choix d'un produit, mais elles ne règlent pas le problème fondamental :
          </p>
          <Card className="p-6 bg-muted/30">
            <p className="text-lg md:text-xl font-semibold text-foreground text-center">
              L'entrepreneur doit d'abord avoir un mur à peinturer.
            </p>
          </Card>
          <p className="text-foreground leading-relaxed">
            Le fournisseur a donc décidé d'agir plus haut dans la chaîne.
          </p>
        </section>

        {/* CHANGEMENT DE STRATÉGIE */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Et si le meilleur programme de fidélisation était de donner plus de travail à ses clients?
          </h2>
          <p className="text-foreground leading-relaxed">
            C'est le principe derrière son partenariat avec UNPRO.
          </p>
          <p className="text-foreground leading-relaxed">
            UNPRO n'est pas un système traditionnel où un propriétaire remplit un formulaire qui est ensuite vendu à trois, quatre ou cinq entrepreneurs.
          </p>
          <p className="text-foreground leading-relaxed">
            La plateforme cherche plutôt à comprendre le projet du propriétaire et à identifier le professionnel qui correspond réellement au besoin.
          </p>
          <p className="text-foreground leading-relaxed">
            Type de travaux, secteur desservi, disponibilité, budget, spécialités et autres critères pertinents peuvent contribuer au jumelage.
          </p>
          <Card className="p-6 border-primary/30 bg-primary/5">
            <p className="text-muted-foreground italic">L'objectif :</p>
            <p className="text-lg md:text-xl text-primary font-semibold mt-2">
              Un propriétaire sérieux + le bon entrepreneur + un rendez-vous exclusif.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pas une course à cinq entrepreneurs pour rappeler le même prospect.
            </p>
          </Card>
          <p className="text-foreground leading-relaxed">
            Pour le fournisseur de peinture, cela ouvre une possibilité nouvelle. Il peut inviter ses meilleurs entrepreneurs à compléter leur présence sur UNPRO afin d'augmenter leurs chances d'être recommandés lorsqu'un projet compatible apparaît dans leur territoire.
          </p>
        </section>

        {/* EXEMPLE CONCRET */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le fournisseur ne vend plus seulement de la peinture
          </h2>
          <p className="text-foreground leading-relaxed">
            Il contribue maintenant à générer la demande qui fera vendre cette peinture.
          </p>
          <p className="text-foreground leading-relaxed font-medium">
            Prenons un exemple simple.
          </p>
          <p className="text-foreground leading-relaxed">
            Un propriétaire de Laval veut faire repeindre son rez-de-chaussée, ses plafonds et plusieurs portes. Il utilise UNPRO.
          </p>
          <p className="text-foreground leading-relaxed">
            Le système détermine les caractéristiques du projet et cherche un entrepreneur compatible. Un peintre recommandé par son fournisseur est bien positionné et obtient éventuellement le contrat.
          </p>
          <p className="text-foreground leading-relaxed">
            Que doit-il faire avant le chantier? Commander de la peinture.
          </p>
          <p className="text-foreground leading-relaxed">
            Et naturellement, l'entrepreneur aura tendance à retourner chez le fournisseur qui contribue déjà à son développement.
          </p>
          <p className="text-foreground leading-relaxed font-medium">
            C'est là que le modèle devient particulièrement puissant. Le fournisseur n'a pas simplement accordé un rabais. Il a aidé son client à faire de l'argent.
          </p>
        </section>

        {/* CERCLE VERTUEUX */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Un cercle vertueux
          </h2>
          <p className="text-foreground leading-relaxed">
            La mécanique peut devenir extrêmement simple :
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {VIRTUOUS_CYCLE.map((step, i) => (
              <Card key={step.label} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Étape {i + 1}</p>
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="flex justify-center">
            <RotateCcw className="h-8 w-8 text-primary/60" />
          </div>
          <p className="text-foreground leading-relaxed">
            La différence avec une promotion traditionnelle est fondamentale. Une promotion cherche à capter une plus grande partie des dépenses existantes. Cette stratégie cherche à augmenter les dépenses en augmentant d'abord le chiffre d'affaires du client.
          </p>
        </section>

        {/* CHANGEMENT DE DISCOURS */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Pourquoi l'entrepreneur accepte-t-il?
          </h2>
          <p className="text-foreground leading-relaxed">
            Parce que le discours du fournisseur change complètement.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Ancien discours
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0" /> « Cette semaine, on vous donne 15 % sur tel produit. »
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Centré sur ce que le fournisseur veut vendre.
              </p>
            </Card>
            <Card className="p-6 border-primary/30 bg-primary/5">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
                Nouveau discours
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> « On travaille avec UNPRO pour aider nos entrepreneurs à obtenir davantage de contrats résidentiels dans leur secteur. »
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Centré sur ce que l'entrepreneur veut obtenir : des contrats.
              </p>
            </Card>
          </div>
          <p className="text-foreground leading-relaxed">
            La conversation n'est plus centrée sur ce que le fournisseur veut vendre. Elle est centrée sur ce que l'entrepreneur veut obtenir : des contrats.
          </p>
        </section>

        {/* FIDÉLITÉ PLUS PROFONDE */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Et cela peut changer la fidélité envers le fournisseur
          </h2>
          <p className="text-foreground leading-relaxed">
            Un entrepreneur peut comparer le prix d'un gallon de peinture. Il peut changer de magasin pour économiser quelques dollars.
          </p>
          <p className="text-foreground leading-relaxed">
            Mais il réfléchira probablement davantage avant de quitter un fournisseur qui contribue directement à remplir son calendrier.
          </p>
          <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
            <p className="text-lg md:text-xl font-semibold text-foreground">
              C'est une forme de fidélisation beaucoup plus profonde.
            </p>
            <p className="mt-2 text-muted-foreground">
              Le fournisseur devient progressivement un partenaire de croissance.
            </p>
          </Card>
          <p className="text-foreground leading-relaxed">
            Son comptoir professionnel peut même devenir un point d'entrée vers UNPRO. Un représentant remarque qu'un peintre achète moins depuis quelques semaines? Plutôt que de simplement lui demander pourquoi ses commandes ont diminué :
          </p>
          <p className="text-foreground leading-relaxed font-medium">
            « Ton calendrier est moins rempli? On peut peut-être t'aider. »
          </p>
          <p className="text-foreground leading-relaxed">
            Quelques minutes plus tard, l'entrepreneur peut recevoir le lien lui permettant de compléter son profil et ses territoires.
          </p>
        </section>

        {/* INTELLIGENCE COMMERCIALE */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Une intelligence commerciale supplémentaire pour le fournisseur
          </h2>
          <p className="text-foreground leading-relaxed">
            À plus grande échelle, le modèle peut également révéler des tendances intéressantes.
          </p>
          <p className="text-foreground leading-relaxed">
            Supposons qu'UNPRO observe une augmentation des demandes pour :
          </p>
          <div className="flex flex-wrap gap-2">
            {TRENDS.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-foreground"
              >
                <MapPin className="h-3 w-3 text-primary" /> {t}
              </span>
            ))}
          </div>
          <p className="text-foreground leading-relaxed">
            Le fournisseur peut éventuellement adapter ses communications, ses stocks, ses formations ou ses promotions aux besoins réels du marché.
          </p>
          <p className="text-foreground leading-relaxed">
            On passe alors d'un modèle essentiellement réactif — attendre que l'entrepreneur commande — à un modèle beaucoup plus intelligent :
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Comprendre la demande", "Créer le chantier", "Accompagner l'entrepreneur", "Fournir les matériaux"].map((s) => (
              <Card key={s} className="p-4 text-center">
                <p className="text-sm font-medium text-foreground">{s}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* EXTENSION À D'AUTRES MÉTIERS */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le potentiel pour les fabricants et distributeurs
          </h2>
          <p className="text-foreground leading-relaxed">
            Le principe ne s'arrête évidemment pas à la peinture. Il pourrait s'appliquer à de nombreux réseaux professionnels :
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {OTHER_TRADES.map((trade) => (
              <div
                key={trade}
                className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground text-center"
              >
                {trade}
              </div>
            ))}
          </div>
          <p className="text-foreground leading-relaxed">
            Pour un fabricant ou un distributeur, la question stratégique devient alors différente.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Avant</p>
              <p className="text-foreground font-medium">
                « Comment pouvons-nous vendre davantage à nos entrepreneurs? »
              </p>
            </Card>
            <Card className="p-6 border-primary/30 bg-primary/5">
              <p className="text-sm text-primary mb-2">Après</p>
              <p className="text-foreground font-medium">
                « Comment pouvons-nous aider nos entrepreneurs à vendre davantage? »
              </p>
            </Card>
          </div>
          <p className="text-foreground leading-relaxed">
            Parce que lorsque leurs ventes augmentent, celles du fournisseur ont de fortes chances de suivre.
          </p>
        </section>

        {/* TRANSFORMATION DE LA RELATION */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            UNPRO transforme ainsi la relation fournisseur-entrepreneur
          </h2>
          <p className="text-foreground leading-relaxed">
            Le fournisseur possède déjà quelque chose d'extrêmement précieux : une relation quotidienne avec des professionnels locaux.
          </p>
          <p className="text-foreground leading-relaxed">
            UNPRO apporte une autre couche : une infrastructure conçue pour connecter les besoins des propriétaires aux entrepreneurs compatibles.
          </p>
          <p className="text-foreground leading-relaxed">
            En réunissant les deux, le fournisseur peut devenir beaucoup plus qu'un endroit où acheter des matériaux. Il peut devenir l'un des moteurs de croissance de ses meilleurs clients.
          </p>
          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 space-y-6">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground font-display leading-tight tracking-tight">
              La prochaine génération de programmes de fidélisation professionnels
            </h3>
            <p className="text-foreground leading-relaxed">
              Pas seulement :
            </p>
            <p className="text-lg font-semibold text-muted-foreground">
              « Achetez plus et obtenez une récompense. »
            </p>
            <p className="text-foreground leading-relaxed">
              Mais plutôt :
            </p>
            <p className="text-lg md:text-xl font-semibold text-primary">
              « On vous aide à obtenir plus de contrats. Et lorsque vous aurez besoin de peinture pour les réaliser, nous serons déjà votre partenaire. »
            </p>
          </Card>
        </section>

        {/* CTA FOURNISSEUR */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-8 md:p-10 space-y-4 border-primary/30">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              Vous êtes fabricant, distributeur ou fournisseur de peinture?
            </h2>
            <p className="text-muted-foreground">
              UNPRO développe des partenariats avec des fournisseurs qui souhaitent aider leurs entrepreneurs à obtenir davantage de projets résidentiels tout en augmentant naturellement leur propre volume de ventes.
            </p>
            <p className="text-muted-foreground">
              Aidez vos clients à vendre plus. Ils auront besoin de vous pour réaliser les travaux.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" onClick={goOffer} className="gap-2">
                Voir ce qu'UNPRO peut garantir <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={goExclusive}>
                Comment fonctionnent les rendez-vous exclusifs?
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              UNPRO — Un propriétaire. Un projet. Un pro.
            </p>
          </Card>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <SectionArticleFAQSEO faqs={FAQS} />
        </section>

        {/* MAILLAGE INTERNE */}
        <section className="max-w-3xl mx-auto px-4 py-10 pb-20 border-t border-border/40">
          <SectionArticleInternalLinksSEO links={INTERNAL_LINKS} />
        </section>
      </article>
    </>
  );
}
