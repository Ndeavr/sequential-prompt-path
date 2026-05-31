/**
 * UNPRO — Article éditorial
 * "Les badges « Choix du consommateur » suffisent-ils encore en 2026?"
 * Ton journalistique, AEO-ready (Article + FAQPage + Breadcrumb JSON-LD).
 */
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  Sparkles,
  ArrowRight,
  ScanLine,
  FileText,
  Building2,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SectionArticleStructuredData from "@/components/articles/SectionArticleStructuredData";
import SectionArticleFAQSEO from "@/components/articles/SectionArticleFAQSEO";
import SectionArticleInternalLinksSEO from "@/components/articles/SectionArticleInternalLinksSEO";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { supabase } from "@/integrations/supabase/client";

const SLUG = "badges-choix-consommateur-2026";
const PUBLISHED = "2026-05-31";

const FAQS = [
  {
    question: "Est-ce qu'un badge « Choix du consommateur » garantit la qualité?",
    answer:
      "Pas nécessairement. Ces distinctions représentent souvent une reconnaissance marketing ou de visibilité, mais elles ne remplacent pas une vérification complète des licences RBQ, des historiques d'entreprise, des assurances et des pratiques de chantier.",
  },
  {
    question: "Une entreprise peut-elle avoir une bonne réputation marketing et quand même avoir des problèmes?",
    answer:
      "Oui. Les moteurs IA modernes (ChatGPT, Gemini, Perplexity, Google AI) croisent maintenant plusieurs sources publiques — registres, articles, décisions, avis — qui peuvent révéler des informations que le consommateur ne voyait pas auparavant.",
  },
  {
    question: "Pourquoi les IA affichent-elles parfois des informations négatives sur des entreprises reconnues?",
    answer:
      "Parce qu'elles analysent désormais des données publiques multiples : articles de presse, registres légaux, historiques de licence RBQ, avis vérifiés, décisions juridiques et signaux de cohérence d'identité.",
  },
  {
    question: "Que devrait vérifier un propriétaire avant de signer un contrat de rénovation?",
    answer:
      "Toujours vérifier la licence RBQ active, les assurances responsabilité, l'identité légale réelle, le détail des travaux, les garanties offertes, la réputation publique et la cohérence des informations entre les sources.",
  },
  {
    question: "Comment UNPRO vérifie-t-elle les entrepreneurs?",
    answer:
      "UNPRO développe une couche d'intelligence qui croise en continu les données publiques, les signaux de cohérence, l'historique RBQ, les avis et les incohérences d'identité — au lieu de se fier à un seul badge marketing.",
  },
];

const INTERNAL_LINKS = [
  { url: "/verifier-entrepreneur", anchor: "Vérifier un entrepreneur" },
  { url: "/analyser-soumissions", anchor: "Analyser 3 soumissions" },
  { url: "/passeport-maison", anchor: "Passeport Maison UNPRO" },
  { url: "/comment-fonctionne-ia", anchor: "Comment fonctionne l'IA UNPRO" },
  { url: "/verification-rbq", anchor: "Vérification RBQ" },
  { url: "/analyse-confiance-entrepreneur", anchor: "Analyse de confiance entrepreneuriale" },
];

const AI_SEES_NOW = [
  { icon: FileText, label: "Historique RBQ et changements de licence" },
  { icon: Building2, label: "Identités légales et changements de nom d'entreprise" },
  { icon: Eye, label: "Cohérence entre site web, registres et annuaires" },
  { icon: Search, label: "Articles de presse et décisions publiques" },
  { icon: AlertTriangle, label: "Signaux d'incohérence et litiges publics" },
  { icon: ShieldCheck, label: "Authenticité des avis et patterns suspects" },
];

const BEFORE_AFTER = [
  {
    era: "Avant",
    color: "text-muted-foreground",
    items: [
      "Un beau camion identifié",
      "Un site web professionnel",
      "Quelques avis Google",
      "Un trophée affiché en vitrine",
      "Une publicité télé",
    ],
  },
  {
    era: "Aujourd'hui",
    color: "text-primary",
    items: [
      "Vérification croisée RBQ en temps réel",
      "Analyse d'identité légale par l'IA",
      "Détection automatique d'incohérences",
      "Validation des avis par patterns",
      "Score de confiance vérifiable",
    ],
  },
];

const HOMEOWNER_CHECKLIST = [
  "Licence RBQ active et conforme",
  "Identité légale de l'entreprise",
  "Historique des changements de noms",
  "Avis réels et vérifiables",
  "Garanties écrites",
  "Assurance responsabilité valide",
  "Cohérence des informations publiques",
  "Qualité et clarté des soumissions",
  "Détail précis des travaux proposés",
];

export default function PageBadgesConsommateur2026() {
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

  const goVerify = () => {
    trackCta("verify_contractor");
    navigate("/verifier-entrepreneur");
  };

  const askAlex = () => {
    trackCta("ask_alex_verify");
    openAlex("general");
  };

  const title =
    "Les badges « Choix du consommateur » suffisent-ils encore à protéger les propriétaires en 2026?";
  const description =
    "En 2026, les moteurs IA croisent licences RBQ, registres, avis et signaux publics. Un badge marketing ne garantit plus automatiquement la confiance. Analyse et grille de vérification.";

  return (
    <>
      <Helmet>
        <title>Badges « Choix du consommateur » en 2026 : suffisent-ils? — UNPRO</title>
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
        wordCount={1400}
        category="Confiance & IA"
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
              <span className="text-foreground">Confiance & IA</span>
            </nav>

            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3 w-3" /> Analyse UNPRO
              </span>
              <span className="text-xs text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Lecture 7 min · Mis à jour mai 2026
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
              Pendant des années, trophées, autocollants et certifications marketing
              suffisaient à inspirer confiance. En 2026, les moteurs IA — Google,
              Gemini, ChatGPT, Perplexity — analysent bien plus que l'image projetée
              par une entreprise.
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
              Un badge promotionnel ne garantit plus automatiquement la confiance réelle.
              Les IA croisent désormais l'historique RBQ, les licences, les avis, les
              articles de presse, les incohérences d'identité et des centaines de
              signaux publics. <strong>Le marketing n'est plus la seule vérité visible.</strong>
            </p>
          </Card>
        </section>

        {/* CE QUE LES IA VOIENT MAINTENANT */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              Ce que les IA voient maintenant
            </h2>
            <p className="mt-2 text-muted-foreground">
              Google, Gemini, ChatGPT et Perplexity ne regardent plus uniquement le
              branding. Ils croisent en continu :
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {AI_SEES_NOW.map(({ icon: Icon, label }, i) => (
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

        {/* AVANT / AUJOURD'HUI */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              Avant vs aujourd'hui
            </h2>
            <p className="mt-2 text-muted-foreground">
              La façon dont les propriétaires évaluent un entrepreneur a fondamentalement changé.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {BEFORE_AFTER.map((col) => (
              <Card key={col.era} className="p-6">
                <h3 className={`text-lg font-semibold mb-4 ${col.color}`}>{col.era}</h3>
                <ul className="space-y-2">
                  {col.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      {col.era === "Avant" ? (
                        <XCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      )}
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        {/* LE PROBLÈME AVEC LES BADGES */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Le problème avec les badges traditionnels
          </h2>
          <p className="text-foreground leading-relaxed">
            Cela ne veut pas dire que tous les programmes de reconnaissance sont mauvais.
            Mais plusieurs consommateurs croient à tort que ces distinctions impliquent
            des audits techniques continus, des inspections de chantier, des enquêtes
            qualité permanentes ou une validation complète des pratiques.
          </p>
          <p className="text-foreground leading-relaxed">
            Dans plusieurs cas, ce n'est pas ce que ces programmes représentent réellement.
            La distinction entre <em>visibilité commerciale</em> et <em>vérification continue</em>
            devient donc essentielle pour le propriétaire de 2026.
          </p>
        </section>

        {/* LE FUTUR */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <h2 className="text-xl md:text-2xl font-bold text-foreground font-display mb-3">
              Le futur : la confiance en temps réel
            </h2>
            <p className="text-muted-foreground italic">
              Le futur du bâtiment ne sera plus basé uniquement sur
            </p>
            <p className="text-lg md:text-xl text-foreground font-semibold my-2">
              « Qui semble le plus crédible? »
            </p>
            <p className="text-muted-foreground italic">Mais plutôt sur</p>
            <p className="text-lg md:text-xl text-primary font-semibold mt-2">
              « Qui peut être vérifié continuellement? »
            </p>
          </Card>
        </section>

        {/* CHECKLIST */}
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">
            Ce qu'un propriétaire devrait vérifier avant d'engager
          </h2>
          <Card className="p-6">
            <ul className="grid sm:grid-cols-2 gap-2">
              {HOMEOWNER_CHECKLIST.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* CTA — VÉRIFIER UN ENTREPRENEUR */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <Card className="p-8 md:p-10 text-center space-y-4 bg-foreground text-background">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/20 mx-auto">
              <ScanLine className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-display">
              Vérifier un entrepreneur maintenant
            </h2>
            <p className="text-background/70 max-w-lg mx-auto">
              UNPRO croise en continu les données publiques pour vous donner une lecture
              honnête — pas un badge marketing.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" onClick={goVerify} className="gap-2">
                Analyser une entreprise <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={askAlex} className="bg-transparent border-background/30 text-background hover:bg-background/10 hover:text-background">
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
        <section className="max-w-3xl mx-auto px-4 py-10 border-t border-border/40">
          <SectionArticleInternalLinksSEO links={INTERNAL_LINKS} />
        </section>

        {/* MISSION UNPRO */}
        <section className="max-w-3xl mx-auto px-4 py-10 pb-20">
          <Card className="p-6 bg-muted/30">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              La mission d'UNPRO
            </h3>
            <p className="text-foreground leading-relaxed">
              Développer une nouvelle couche de confiance résidentielle basée sur les
              données, la cohérence, la transparence, l'intelligence artificielle et la
              vérification continue. Parce qu'en rénovation, les erreurs coûtent souvent
              des milliers de dollars — et la confiance ne devrait jamais dépendre
              uniquement d'un autocollant.
            </p>
          </Card>
        </section>
      </article>
    </>
  );
}
