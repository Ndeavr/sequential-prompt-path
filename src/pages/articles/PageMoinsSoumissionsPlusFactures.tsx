/**
 * UNPRO — Article éditorial
 * "Moins de soumissions, plus de factures"
 * Audience : entrepreneurs en rénovation et construction au Québec.
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
  Timer,
  Target,
  XCircle,
  CheckCircle2,
  TrendingUp,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SectionArticleStructuredData from "@/components/articles/SectionArticleStructuredData";
import SectionArticleFAQSEO from "@/components/articles/SectionArticleFAQSEO";
import SectionArticleInternalLinksSEO from "@/components/articles/SectionArticleInternalLinksSEO";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/articles/moins-soumissions-plus-factures.jpg";

const SLUG = "moins-de-soumissions-plus-de-factures";
const PUBLISHED = "2026-08-19";

const TITLE = "Moins de soumissions, plus de factures";
const H1 =
  "Moins de soumissions, plus de factures : pourquoi les entrepreneurs doivent changer de stratégie en 2026";
const DESCRIPTION =
  "Faire plus de soumissions ne signifie pas obtenir plus de contrats. Découvrez pourquoi les entrepreneurs québécois doivent viser de meilleurs rendez-vous plutôt que davantage de leads.";

const FAQS = [
  {
    question: "Est-ce qu'un entrepreneur devrait arrêter de faire des soumissions?",
    answer:
      "Non. Certains projets nécessitent évidemment une estimation détaillée. L'objectif est plutôt de réduire les soumissions inutiles en améliorant la qualification et la compatibilité avant le déplacement.",
  },
  {
    question: "Quelle est la différence entre un lead et un rendez-vous exclusif?",
    answer:
      "Un lead peut simplement être une personne ayant manifesté un intérêt et peut parfois être transmis à plusieurs entreprises. Dans le modèle UNPRO, l'objectif est de créer une occasion qualifiée attribuée à un professionnel compatible plutôt que de partager la même demande.",
  },
  {
    question: "Pourquoi les soumissions perdues coûtent-elles cher?",
    answer:
      "Parce qu'elles mobilisent du temps de qualification, déplacement, inspection, estimation et suivi qui ne produit aucun revenu lorsque le projet n'est pas obtenu.",
  },
  {
    question: "Comment l'IA peut-elle aider les entrepreneurs?",
    answer:
      "Elle peut notamment structurer les besoins d'un propriétaire et les caractéristiques des professionnels afin de réduire les incompatibilités avant la mise en relation.",
  },
];

const INTERNAL_LINKS = [
  { url: "/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur", anchor: "Comment apparaître dans les résultats de recherche par l'IA en 2026" },
  { url: "/entrepreneurs", anchor: "UNPRO pour les entrepreneurs" },
  { url: "/entrepreneur/garantie", anchor: "Rendez-vous garantis : comment ça fonctionne" },
  { url: "/entrepreneur/pricing", anchor: "Tarification entrepreneur" },
  { url: "/articles/fournisseur-peinture-plus-contrats", anchor: "Comment un fournisseur de peinture a augmenté ses ventes avec UNPRO" },
  { url: "/pourquoi-pas-trois-soumissions", anchor: "Pourquoi la fin des 3 soumissions" },
  { url: "/comment-fonctionne-ia", anchor: "Comment fonctionne la recommandation IA" },
  { url: "/articles/badges-choix-consommateur-2026", anchor: "Les badges « Choix du consommateur » en 2026" },
];

const HIDDEN_COST = [
  "Qualification",
  "Déplacement",
  "Inspection",
  "Calcul des matériaux",
  "Préparation du prix",
  "Suivis",
];

const OLD_MODEL = [
  "1 propriétaire",
  "3 entrepreneurs",
  "3 déplacements",
  "3 soumissions",
  "1 contrat",
];

const UNPRO_MODEL = [
  "1 projet",
  "Analyse",
  "Meilleur match",
  "Rendez-vous exclusif",
  "Contrat potentiel",
];

const KPIS = [
  "Rendez-vous pertinents",
  "Taux de conversion",
  "Revenus générés",
  "Temps consacré à l'acquisition",
  "Valeur moyenne des contrats",
  "Soumissions perdues",
];

const HOMEOWNER_INPUTS = ["Projet", "Localisation", "Budget", "Urgence", "Contraintes", "Disponibilités"];
const CONTRACTOR_INPUTS = [
  "Spécialités",
  "Territoire",
  "Capacité",
  "Projets recherchés",
  "Disponibilité",
  "Qualifications",
  "Informations vérifiées disponibles",
];

export default function PageMoinsSoumissionsPlusFactures() {
  const navigate = useNavigate();

  const trackCta = useCallback((ctaKey: string) => {
    supabase
      .from("entrepreneur_cta_events")
      .insert({ visitor_id: crypto.randomUUID(), cta_key: ctaKey, page_section: SLUG })
      .then(() => {});
  }, []);

  const goOffer = () => {
    trackCta("article_offer_personnalisee");
    navigate("/entrepreneur/devis-personnalise");
  };

  const goExclusive = () => {
    trackCta("article_rendez_vous_exclusifs");
    navigate("/entrepreneur/garantie");
  };

  return (
    <>
      <Helmet>
        <title>Moins de soumissions, plus de factures | Entrepreneurs Québec | UNPRO</title>
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
        wordCount={1500}
        category="Entrepreneurs"
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
              <span className="text-foreground">Entrepreneurs</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3 w-3" /> Analyse UNPRO
              </span>
              <span className="text-xs text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Lecture 8 min · Août 2026
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
              Un entrepreneur ne devrait pas chercher plus de demandes de soumissions. Il devrait
              chercher plus de rendez-vous exclusifs, pertinents et susceptibles de devenir des
              contrats facturables.
            </p>

            <img
              src={heroImage}
              width={1600}
              height={900}
              alt="Entrepreneur québécois assis dans son camion en fin de journée, entouré de dossiers et d'estimations papier, préparant ses soumissions"
              className="mt-8 w-full h-auto rounded-2xl border border-border/40 object-cover"
            />
          </div>
        </section>

        {/* INTRO */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <p className="text-foreground leading-relaxed">
            Pendant des années, on a vendu aux entrepreneurs une idée simple : plus vous recevez de
            demandes de soumissions, plus vous aurez de contrats. Plus de leads. Plus d'appels. Plus
            de formulaires. Plus de soumissions.
          </p>
          <p className="text-foreground leading-relaxed">
            Mais chaque soumission demande du temps : qualification, appels, déplacement, mesures,
            calcul des matériaux, préparation du prix et suivis. Et aucune ne garantit un contrat.
          </p>
          <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
            <p className="text-muted-foreground italic">En 2026, la meilleure question n'est plus :</p>
            <p className="text-lg md:text-xl text-foreground font-semibold my-2">
              « Comment obtenir plus de soumissions? »
            </p>
            <p className="text-muted-foreground italic">Mais :</p>
            <p className="text-lg md:text-xl text-primary font-semibold mt-2">
              « Comment transformer davantage de mon temps en factures? »
            </p>
          </Card>
          <p className="text-foreground leading-relaxed">C'est le changement de logique derrière UNPRO.</p>
        </section>

        {/* PROBLÈME 3 SOUMISSIONS */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le problème des « 3 soumissions »
          </h2>
          <p className="text-foreground leading-relaxed">
            Le modèle traditionnel repose sur la compétition. Un propriétaire décrit son projet et
            plusieurs entrepreneurs sont invités à soumissionner.
          </p>
          <p className="text-foreground leading-relaxed">
            Trois entrepreneurs peuvent alors contacter le même propriétaire, analyser le même projet,
            se déplacer à la même adresse, préparer trois estimations et effectuer trois suivis.
            Pourtant, un seul obtiendra le contrat.
          </p>
          <p className="text-foreground leading-relaxed font-medium">
            Pour chaque gagnant, plusieurs entrepreneurs ont travaillé sans être payés.
          </p>
        </section>

        {/* SOUMISSION ≠ CONTRAT */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Une soumission n'est pas un contrat
          </h2>
          <p className="text-foreground leading-relaxed">
            Recevoir 30 demandes n'est pas nécessairement mieux qu'en recevoir 12. Tout dépend de leur
            qualité.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Entrepreneur A</p>
              <p className="text-2xl font-bold text-foreground mt-1">30 demandes</p>
              <p className="text-sm text-muted-foreground mt-2">6 contrats signés</p>
            </Card>
            <Card className="p-6 border-primary/30 bg-primary/5">
              <p className="text-sm text-muted-foreground">Entrepreneur B</p>
              <p className="text-2xl font-bold text-foreground mt-1">12 occasions compatibles</p>
              <p className="text-sm text-muted-foreground mt-2">6 contrats signés</p>
            </Card>
          </div>
          <p className="text-foreground leading-relaxed">
            Même résultat. Beaucoup moins de temps perdu. Le deuxième entrepreneur n'avait pas besoin
            de plus de leads. Il avait besoin de meilleurs matchs.
          </p>
        </section>

        {/* COÛT D'UNE SOUMISSION */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le véritable coût d'une soumission perdue
          </h2>
          <p className="text-foreground leading-relaxed">
            Une soumission gratuite n'est jamais réellement gratuite. Additionnez :
          </p>
          <div className="flex flex-wrap gap-2">
            {HIDDEN_COST.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-foreground"
              >
                <Timer className="h-3 w-3 text-primary" /> {c}
              </span>
            ))}
          </div>
          <p className="text-foreground leading-relaxed">
            Quelques heures multipliées par plusieurs soumissions perdues chaque semaine peuvent
            représenter des centaines d'heures annuellement. Ces heures auraient pu servir à réaliser
            des contrats, superviser des équipes, améliorer les opérations ou développer l'entreprise.
          </p>

          <Card className="p-6 md:p-8 bg-foreground text-background">
            <p className="text-xs uppercase tracking-wide text-background/60 flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5" /> Le coût invisible
            </p>
            <p className="text-2xl md:text-4xl font-bold font-display mt-3 break-words">
              10 soumissions × 2,5 h = 25 heures
            </p>
            <p className="mt-3 text-background/75">
              Combien de ces heures deviennent réellement facturables?
            </p>
            <p className="mt-4 text-xs text-background/50">
              Illustration pédagogique. Il ne s'agit pas d'une statistique mesurée par UNPRO.
            </p>
          </Card>
        </section>

        {/* GUERRE DU PRIX */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            La guerre du prix
          </h2>
          <p className="text-foreground leading-relaxed">
            Lorsque trois, quatre ou cinq entrepreneurs proposent leurs prix pour exactement le même
            projet, la comparaison finit souvent par se concentrer sur la variable la plus facile à
            comprendre : le prix.
          </p>
          <p className="text-foreground leading-relaxed">
            Mais le meilleur professionnel n'est pas nécessairement le moins cher. Expérience,
            spécialisation, disponibilité, assurances, garanties, matériaux et qualité d'exécution
            peuvent avoir beaucoup plus d'importance.
          </p>
          <Card className="p-6 bg-muted/30">
            <p className="text-muted-foreground italic">La bonne question n'est donc plus :</p>
            <p className="text-lg font-semibold text-foreground my-2">« Qui veut soumissionner? »</p>
            <p className="text-muted-foreground italic">Mais :</p>
            <p className="text-lg font-semibold text-primary mt-2">
              « Qui est le meilleur professionnel disponible pour ce projet précis? »
            </p>
          </Card>
        </section>

        {/* DU LEAD AU MATCH */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              Passer du lead au match
            </h2>
            <p className="mt-2 text-muted-foreground">
              C'est ici que l'intelligence artificielle peut transformer l'acquisition de clients.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Besoins du propriétaire</h3>
              <ul className="space-y-2">
                {HOMEOWNER_INPUTS.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {i}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Caractéristiques de l'entrepreneur</h3>
              <ul className="space-y-2">
                {CONTRACTOR_INPUTS.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {i}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            UNPRO distingue toujours les statuts d'information : vérifiée (Verified), déclarée
            (Declared), inférée (Inferred) ou en attente (Pending). Une donnée déclarée ou inférée
            n'est jamais présentée comme vérifiée.
          </p>
        </section>

        {/* COMPARATIF */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            UNPRO ne veut pas envoyer la même demande à trois entrepreneurs
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Ancien modèle
              </h3>
              <ol className="space-y-1">
                {OLD_MODEL.map((step, i) => (
                  <li key={step}>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <XCircle className="h-4 w-4 text-muted-foreground shrink-0" /> {step}
                    </div>
                    {i < OLD_MODEL.length - 1 && (
                      <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/50 ml-[3px] my-1" />
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm font-semibold text-foreground">
                2 entrepreneurs ont travaillé pour rien.
              </p>
            </Card>

            <Card className="p-6 border-primary/30 bg-primary/5">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
                Modèle UNPRO
              </h3>
              <ol className="space-y-1">
                {UNPRO_MODEL.map((step, i) => (
                  <li key={step}>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {step}
                    </div>
                    {i < UNPRO_MODEL.length - 1 && (
                      <ArrowDown className="h-3.5 w-3.5 text-primary/40 ml-[3px] my-1" />
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm font-semibold text-primary">Jamais de lead partagé.</p>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            Un rendez-vous exclusif ne garantit pas qu'un contrat sera signé. Il garantit que
            l'occasion n'est pas partagée et qu'elle a été qualifiée avant le déplacement.
          </p>
        </section>

        {/* SECTION DOMINANTE */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-display leading-tight tracking-tight">
              Moins de soumissions.
              <br />
              Plus de factures.
            </h2>
            <p className="text-foreground leading-relaxed">
              Un entrepreneur devrait davantage mesurer :
            </p>
            <ul className="grid sm:grid-cols-2 gap-2">
              {KPIS.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {k}
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <p className="text-muted-foreground italic">Le KPI principal n'est pas :</p>
              <p className="text-lg font-semibold text-foreground my-1">
                Combien de leads avons-nous reçus?
              </p>
              <p className="text-muted-foreground italic">Mais plutôt :</p>
              <p className="text-lg font-semibold text-primary mt-1">
                Combien de bonnes occasions sont devenues des contrats?
              </p>
            </div>
          </Card>
        </section>

        {/* ENTREPRENEUR DE DEMAIN */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            L'entrepreneur de demain pourrait soumissionner moins
          </h2>
          <p className="text-foreground leading-relaxed">
            Un entrepreneur qui comprend son territoire optimal, ses spécialités, sa capacité réelle
            et les types de projets les plus rentables pour son entreprise peut devenir beaucoup plus
            sélectif.
          </p>
          <p className="text-foreground leading-relaxed">
            L'intelligence artificielle devrait alors agir comme un filtre intelligent — pas comme une
            machine à générer davantage de bruit.
          </p>
        </section>

        {/* CONCLUSION */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Et si la meilleure soumission était celle qu'on n'avait pas besoin de faire?
          </h2>
          <p className="text-foreground leading-relaxed">
            Une industrie plus intelligente peut mieux qualifier les projets, mieux comprendre les
            entrepreneurs et mieux recommander.
          </p>
          <p className="text-foreground leading-relaxed">
            Parce qu'un entrepreneur ne gagne pas sa vie en faisant des soumissions. Il gagne sa vie
            lorsqu'une soumission devient un contrat. Puis lorsqu'un contrat devient une facture.
          </p>
          <Card className="p-8 md:p-12 text-center bg-foreground text-background space-y-3">
            <p className="text-3xl md:text-5xl font-bold font-display leading-tight tracking-tight">
              MOINS DE SOUMISSIONS.
              <br />
              PLUS DE FACTURES.
            </p>
            <p className="text-sm md:text-base text-background/70">
              UNPRO — Un projet. Un bon match. Un PRO.
            </p>
          </Card>
        </section>

        {/* CTA ENTREPRENEUR */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-8 md:p-10 space-y-4 border-primary/30">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              Vous ne voulez pas plus de leads. Vous voulez plus de bons contrats.
            </h2>
            <p className="text-muted-foreground">
              Dites-nous votre territoire, vos spécialités et vos objectifs. UNPRO vous dira ce que
              nous pouvons vous garantir.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" onClick={goOffer} className="gap-2">
                Voir ce qu'UNPRO peut me garantir <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={goExclusive}>
                Comment fonctionnent les rendez-vous exclusifs?
              </Button>
            </div>
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
