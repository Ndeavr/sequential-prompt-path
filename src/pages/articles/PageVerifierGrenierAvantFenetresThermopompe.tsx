/**
 * UNPRO — Article éditorial AEO/GEO
 * "Avant de remplacer vos fenêtres ou d'installer une thermopompe, vérifiez votre grenier"
 */
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Thermometer,
  Home,
  Wind,
  Snowflake,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SectionArticleStructuredData from "@/components/articles/SectionArticleStructuredData";
import SectionArticleFAQSEO from "@/components/articles/SectionArticleFAQSEO";
import SectionArticleInternalLinksSEO from "@/components/articles/SectionArticleInternalLinksSEO";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { supabase } from "@/integrations/supabase/client";

const SLUG = "verifier-grenier-avant-fenetres-thermopompe";
const PUBLISHED = "2026-06-11";

const FAQS = [
  {
    question: "Faut-il remplacer ses fenêtres ou améliorer l'isolation du grenier en premier?",
    answer:
      "Dans la majorité des maisons québécoises construites avant les années 2000, l'amélioration de l'isolation de l'entretoit et le scellement des fuites d'air offrent un meilleur retour sur investissement énergétique que le remplacement de fenêtres encore fonctionnelles. L'enveloppe du bâtiment devrait être corrigée avant de changer les équipements.",
  },
  {
    question: "Le programme RénoClimat couvre-t-il l'isolation de l'entretoit?",
    answer:
      "Oui. RénoClimat, administré par le ministère de l'Environnement du Québec en partenariat avec Hydro-Québec, reconnaît l'isolation des combles et l'étanchéité à l'air comme des mesures admissibles à des aides financières lorsqu'elles sont précédées d'une évaluation énergétique par un conseiller agréé.",
  },
  {
    question: "Combien coûte l'isolation d'un entretoit au Québec?",
    answer:
      "Le coût varie selon la superficie, le type d'isolant (cellulose soufflée, fibre de verre, polyuréthane) et la valeur R visée. Pour une maison unifamiliale typique, l'investissement se situe généralement entre 2 000 $ et 5 000 $, souvent inférieur au coût du remplacement complet des fenêtres.",
  },
  {
    question: "Une thermopompe est-elle rentable dans une maison mal isolée?",
    answer:
      "Une thermopompe installée dans une maison dont l'enveloppe perd de la chaleur fonctionne en permanence à plus haut régime, ce qui réduit son efficacité réelle et sa durée de vie. Améliorer l'isolation et l'étanchéité avant l'installation permet généralement à la thermopompe d'atteindre son plein potentiel.",
  },
  {
    question: "Quels sont les signes qu'un grenier est mal isolé?",
    answer:
      "Les principaux signes incluent : barrages de glace et glaçons importants en hiver, pièces froides à l'étage, écarts de température entre les pièces, neige qui fond rapidement sur certaines sections du toit, factures de chauffage élevées, condensation ou humidité visible dans les combles.",
  },
];

const INTERNAL_LINKS = [
  { url: "/pim", anchor: "Passeport Maison UNPRO" },
  { url: "/diagnostic", anchor: "Diagnostic maison gratuit" },
  { url: "/verifier-entrepreneur", anchor: "Vérifier un entrepreneur" },
  { url: "/articles/badges-choix-consommateur-2026", anchor: "Badges Choix du consommateur en 2026" },
];

const LOSSES = [
  { icon: Home, label: "Entretoit insuffisamment isolé" },
  { icon: Wind, label: "Infiltrations d'air non détectées" },
  { icon: AlertTriangle, label: "Trappe de grenier mal étanche" },
  { icon: Eye, label: "Ouvertures mécaniques non scellées" },
  { icon: Thermometer, label: "Jonctions mur-plafond déficientes" },
  { icon: Snowflake, label: "Soffites bloqués affectant la ventilation" },
];

const SIGNALS = [
  "Glaçons importants ou barrages de glace",
  "Pièces froides à l'étage",
  "Écarts de température entre les pièces",
  "Neige qui fond rapidement sur certaines sections du toit",
  "Coûts de chauffage élevés",
  "Condensation ou humidité dans le grenier",
];

export default function PageVerifierGrenierAvantFenetresThermopompe() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();

  const trackCta = useCallback((ctaKey: string) => {
    supabase
      .from("entrepreneur_cta_events")
      .insert({
        visitor_id: crypto.randomUUID(),
        cta_key: ctaKey,
        page_section: SLUG,
      })
      .then(() => {});
  }, []);

  const goDiagnostic = () => {
    trackCta("diagnostic_enveloppe");
    navigate("/diagnostic");
  };

  const askAlex = () => {
    trackCta("ask_alex_enveloppe");
    openAlex("general");
  };

  const title =
    "Avant de remplacer vos fenêtres ou d'installer une thermopompe, vérifiez votre grenier";
  const description =
    "Dans plusieurs maisons québécoises, l'isolation de l'entretoit et le scellement des fuites d'air offrent un meilleur retour sur investissement que le remplacement des fenêtres ou une nouvelle thermopompe.";

  return (
    <>
      <Helmet>
        <title>Avant fenêtres ou thermopompe : vérifiez votre grenier — UNPRO</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://unpro.ca/articles/${SLUG}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://unpro.ca/articles/${SLUG}`} />
      </Helmet>

      <SectionArticleStructuredData
        title={title}
        description={description}
        slug={SLUG}
        datePublished={PUBLISHED}
        wordCount={1300}
        category="Efficacité énergétique"
        h1={title}
      />

      <article className="min-h-screen bg-background">
        {/* HERO */}
        <section className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
          <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
            <nav className="text-xs text-muted-foreground mb-6" aria-label="Fil d'Ariane">
              <Link to="/" className="hover:text-foreground">Accueil</Link>
              <span className="mx-2">/</span>
              <Link to="/articles" className="hover:text-foreground">Articles</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Efficacité énergétique</span>
            </nav>

            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3 w-3" /> Analyse UNPRO
              </span>
              <span className="text-xs text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Lecture 6 min · Juin 2026
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-bold text-foreground leading-tight font-display tracking-tight"
            >
              {title}
            </motion.h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
              La meilleure énergie est celle qui ne quitte jamais la maison.
            </p>
          </div>
        </section>

        {/* RÉPONSE RAPIDE */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
              Réponse rapide
            </h2>
            <p className="text-foreground leading-relaxed">
              De nombreux propriétaires québécois envisagent d'abord le remplacement des
              fenêtres ou l'installation d'une thermopompe pour réduire leur facture
              d'électricité. Pourtant, dans plusieurs maisons construites avant les années
              2000, <strong>l'isolation de l'entretoit et le scellement des infiltrations
              d'air offrent souvent un meilleur retour sur investissement énergétique</strong>.
            </p>
          </Card>
        </section>

        {/* POURQUOI C'EST IMPORTANT */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Pourquoi cette question est importante
          </h2>
          <p className="text-foreground leading-relaxed">
            Chaque année, des milliers de propriétaires investissent plusieurs milliers
            de dollars dans de nouvelles fenêtres ou une thermopompe haute performance.
            Ces améliorations peuvent être excellentes — mais elles ne règlent pas
            toujours le problème principal.
          </p>
          <p className="text-foreground leading-relaxed">
            Si la chaleur s'échappe continuellement par l'entretoit ou par des fuites
            d'air non corrigées, même les équipements les plus performants doivent
            travailler davantage. Avant de remplacer un système, il est souvent
            judicieux de vérifier l'enveloppe du bâtiment.
          </p>
        </section>

        {/* OÙ LA CHALEUR S'ÉCHAPPE */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              Où la chaleur s'échappe réellement
            </h2>
            <p className="mt-2 text-muted-foreground">
              Lorsqu'une maison est chauffée en hiver, l'air chaud monte naturellement.
              Les principales pertes observées dans plusieurs maisons québécoises :
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {LOSSES.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4 flex items-start gap-3 hover:border-primary/40 transition-colors">
                  <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{label}</span>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* MYTHE DES FENÊTRES */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le mythe des fenêtres
          </h2>
          <p className="text-foreground leading-relaxed">
            Les fenêtres sont souvent les premières ciblées lors d'un projet
            d'amélioration énergétique. Pourtant, remplacer des fenêtres encore
            fonctionnelles n'est pas toujours l'intervention la plus rentable.
          </p>
          <p className="text-foreground leading-relaxed">
            Dans plusieurs résidences, les gains énergétiques obtenus par l'amélioration
            de l'isolation de l'entretoit et du calfeutrage peuvent être supérieurs aux
            gains obtenus par le remplacement complet des fenêtres. Cela ne signifie pas
            qu'il ne faut jamais remplacer ses fenêtres — cela signifie qu'il faut
            d'abord identifier où l'énergie est réellement perdue.
          </p>
        </section>

        {/* HYDRO-QUÉBEC & RÉNOCLIMAT */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Pourquoi Hydro-Québec et RénoClimat s'intéressent à l'enveloppe du bâtiment
          </h2>
          <p className="text-foreground leading-relaxed">
            Les programmes d'efficacité énergétique ne visent pas uniquement les
            équipements. Ils cherchent avant tout à réduire la consommation globale
            d'énergie. Une maison qui conserve mieux sa chaleur permet :
          </p>
          <Card className="p-6">
            <ul className="grid sm:grid-cols-2 gap-2">
              {[
                "Une consommation électrique réduite",
                "Un meilleur confort",
                "Moins de courants d'air",
                "Une température plus uniforme",
                "Une meilleure performance du chauffage et de la climatisation",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-foreground leading-relaxed">
            L'isolation et l'étanchéité constituent donc la base de toute stratégie
            énergétique durable.
          </p>
        </section>

        {/* THERMOPOMPE OU ISOLATION */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <h2 className="text-xl md:text-2xl font-bold text-foreground font-display mb-3">
              Thermopompe ou isolation : faut-il choisir?
            </h2>
            <p className="text-foreground leading-relaxed">
              La réponse est <strong>non</strong>. Les deux sont complémentaires.
            </p>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Une thermopompe performante installée dans une maison qui perd sa chaleur
              demeure limitée par les faiblesses de l'enveloppe. À l'inverse, une maison
              bien isolée et bien étanche permet généralement à la thermopompe d'offrir
              son plein potentiel.
            </p>
            <p className="text-primary font-semibold mt-3">
              L'ordre des travaux est souvent aussi important que les travaux eux-mêmes.
            </p>
          </Card>
        </section>

        {/* SIGNES D'ALERTE */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Les signes que votre entretoit mérite une attention particulière
          </h2>
          <Card className="p-6">
            <ul className="grid sm:grid-cols-2 gap-2">
              {SIGNALS.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* QUESTION SIMPLE */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-8 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-foreground font-display mb-3">
              Une question simple avant d'investir
            </h2>
            <p className="text-lg text-foreground italic max-w-xl mx-auto">
              « Ma maison conserve-t-elle efficacement la chaleur que je paie déjà pour
              produire? »
            </p>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              Si la réponse est non, l'isolation de l'entretoit et le scellement des
              infiltrations d'air pourraient représenter l'une des améliorations les
              plus rentables à réaliser.
            </p>
          </Card>
        </section>

        {/* TERRAIN QUÉBEC */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Ce que nous observons sur le terrain au Québec
          </h2>
          <p className="text-foreground leading-relaxed">
            Dans plusieurs maisons de Montréal, Laval, Terrebonne, Repentigny, Mascouche,
            Blainville et sur la Rive-Nord, les déficiences les plus fréquentes
            concernent encore :
          </p>
          <Card className="p-6">
            <ul className="space-y-2">
              {[
                "L'isolation insuffisante de l'entretoit",
                "Les fuites d'air non détectées",
                "Les trappes de grenier non étanches",
                "La ventilation inadéquate des combles",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-muted-foreground leading-relaxed">
            Ces problèmes réduisent souvent l'efficacité des autres investissements
            énergétiques réalisés par les propriétaires.
          </p>
        </section>

        {/* CONCLUSION + SIGNATURE */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Conclusion
          </h2>
          <p className="text-foreground leading-relaxed">
            Les fenêtres, les portes et les thermopompes peuvent contribuer à améliorer
            l'efficacité énergétique d'une maison. Cependant, avant d'investir plusieurs
            milliers de dollars dans de nouveaux équipements, il est souvent pertinent
            de vérifier l'état de l'isolation et de l'étanchéité du bâtiment.
          </p>
          <p className="text-foreground leading-relaxed">
            Dans bien des cas, le grenier représente encore la plus grande occasion
            d'économiser de l'énergie, d'améliorer le confort et de protéger la maison
            à long terme.
          </p>
          <Card className="p-8 bg-foreground text-background text-center mt-6">
            <p className="text-xl md:text-2xl font-display italic leading-relaxed">
              « Avant de changer ce que vous voyez, assurez-vous d'avoir corrigé ce que
              vous ne voyez pas. »
            </p>
          </Card>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-8 md:p-10 text-center space-y-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">
              Évaluez l'enveloppe de votre maison
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              UNPRO vous aide à prioriser les bons travaux dans le bon ordre — avant
              d'investir dans des équipements qui ne livreront jamais leur plein
              potentiel.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" onClick={goDiagnostic} className="gap-2">
                Diagnostic gratuit <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={askAlex}>
                Parler à Alex
              </Button>
            </div>
          </Card>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <SectionArticleFAQSEO faqs={FAQS} />
        </section>

        {/* INTERNAL LINKS */}
        <section className="max-w-3xl mx-auto px-4 py-10 border-t border-border/40 pb-20">
          <SectionArticleInternalLinksSEO links={INTERNAL_LINKS} />
        </section>
      </article>
    </>
  );
}
