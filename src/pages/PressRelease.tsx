import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const PressRelease = () => {
  return (
    <>
      <Helmet>
        <title>Communiqué de presse — UnPRO simplifie la vie des propriétaires</title>
        <meta name="description" content="UnPRO, plateforme québécoise d'intelligence artificielle, simplifie la recherche d'entrepreneurs fiables et élimine les soumissions inutiles." />
        <meta property="og:title" content="UnPRO — Communiqué de presse officiel" />
        <meta property="og:description" content="Une plateforme québécoise promet de simplifier la vie des propriétaires et d'éliminer les soumissions inutiles." />
        <meta property="og:type" content="article" />
        <link rel="canonical" href="https://unpro.ca/communique" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": "Une plateforme québécoise promet de simplifier la vie des propriétaires et d'éliminer les soumissions inutiles",
          "datePublished": "2026-03-30",
          "publisher": { "@type": "Organization", "name": "UnPRO", "url": "https://unpro.ca" },
          "description": "UnPRO utilise l'intelligence artificielle pour analyser les besoins des utilisateurs et recommander des professionnels."
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Nav bar */}
        <div className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-1.5" />Retour</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />Partager
            </Button>
          </div>
        </div>

        <article className="max-w-3xl mx-auto px-4 py-10 md:py-16">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 px-3 py-1 rounded-full mb-6">
              Communiqué de presse
            </span>

            <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              Une plateforme québécoise promet de simplifier la vie des propriétaires et d'éliminer les soumissions inutiles
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Montréal, QC</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />30 mars 2026</span>
            </div>
          </motion.div>

          <Separator className="mb-8" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="prose prose-lg max-w-none text-foreground/90
              prose-headings:text-foreground prose-headings:font-display
              prose-p:leading-relaxed prose-li:leading-relaxed
              prose-strong:text-foreground"
          >
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Trouver un entrepreneur fiable pour des travaux à la maison est souvent compliqué, long et stressant. Une nouvelle plateforme québécoise, <strong className="text-foreground">UnPRO</strong>, affirme pouvoir changer ça en profondeur.
            </p>
            <p>Son objectif&nbsp;: réduire les délais, éviter les mauvaises surprises et simplifier les décisions pour les propriétaires.</p>

            <h2 className="text-xl md:text-2xl font-bold mt-10 mb-4">Un problème que plusieurs Québécois connaissent</h2>
            <p>Quand vient le temps de faire des travaux, plusieurs propriétaires doivent&nbsp;:</p>
            <ul className="space-y-2 my-4">
              <li>Appeler plusieurs entrepreneurs</li>
              <li>Attendre des soumissions</li>
              <li>Comparer des prix difficiles à comprendre</li>
              <li>Prendre une décision sans être certains</li>
            </ul>
            <blockquote className="border-l-4 border-primary pl-4 my-6 italic text-muted-foreground">
              «&nbsp;On entend souvent des gens dire qu'ils ont perdu du temps ou qu'ils ne savaient pas à qui faire confiance&nbsp;»
              <span className="block text-sm mt-1 not-italic">— L'équipe derrière UnPRO</span>
            </blockquote>

            <h2 className="text-xl md:text-2xl font-bold mt-10 mb-4">Une approche différente</h2>
            <p>Au lieu de demander plusieurs soumissions, la plateforme propose&nbsp;:</p>
            <ul className="space-y-2 my-4">
              <li>👉 Une analyse rapide du besoin</li>
              <li>👉 Une sélection de professionnels adaptés</li>
              <li>👉 Une recommandation claire</li>
              <li>👉 La possibilité de réserver directement un rendez-vous</li>
            </ul>
            <p>L'objectif est simple&nbsp;: aller droit au bon choix, sans passer par un processus compliqué.</p>

            <h2 className="text-xl md:text-2xl font-bold mt-10 mb-4">Moins de pertes de temps, plus de confiance</h2>
            <p>Selon ses créateurs, le système permet&nbsp;:</p>
            <ul className="space-y-2 my-4">
              <li>De réduire les délais pour trouver un entrepreneur</li>
              <li>D'éviter les démarches inutiles</li>
              <li>De mieux comprendre les options disponibles</li>
            </ul>
            <p>Du côté des entrepreneurs, la plateforme vise aussi à&nbsp;:</p>
            <ul className="space-y-2 my-4">
              <li>Éviter les demandes peu sérieuses</li>
              <li>Réduire les déplacements inutiles</li>
              <li>Améliorer la qualité des clients</li>
            </ul>

            <h2 className="text-xl md:text-2xl font-bold mt-10 mb-4">Une technologie basée sur l'intelligence artificielle</h2>
            <p>UnPRO utilise l'intelligence artificielle pour analyser les besoins des utilisateurs et recommander des professionnels selon différents critères, comme l'expérience, les services offerts et la compatibilité avec le projet.</p>

            <h2 className="text-xl md:text-2xl font-bold mt-10 mb-4">Disponible progressivement</h2>
            <p>La plateforme est actuellement en déploiement au Québec et sera accessible progressivement aux propriétaires et aux entrepreneurs dans différentes régions.</p>

            <Separator className="my-10" />

            <div className="bg-muted/50 rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-bold mb-2">À propos d'UnPRO</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-0">
                UnPRO est une entreprise québécoise qui développe une plateforme numérique visant à simplifier la recherche de services résidentiels grâce à l'intelligence artificielle.
              </p>
            </div>

            <div className="mt-8 text-sm text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground mb-2">Contact média</p>
              <p>Site web&nbsp;: <a href="https://unpro.ca" className="text-primary hover:underline">unpro.ca</a></p>
            </div>
          </motion.div>
        </article>
      </div>
    </>
  );
};

export default PressRelease;
