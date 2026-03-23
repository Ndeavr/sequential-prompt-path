import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, MessageCircle, Camera, ArrowRight, Upload, Shield, Zap, Brain } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

const SUGGESTED_PROMPTS = [
  "J'ai une infiltration d'eau au sous-sol",
  "Combien coûte refaire une toiture?",
  "Aide-moi à choisir un entrepreneur",
  "Analyse ma soumission",
  "Ma maison perd de la chaleur, pourquoi?",
  "Mon drain français est-il bouché?",
  "Quand remplacer une thermopompe?",
  "Fissures dans ma fondation — c'est grave?",
];

export default function ParlerAAlexPage() {
  const { openAlex } = useAlexVoice();

  return (
    <>
      <Helmet>
        <title>Parler à Alex — Assistant IA immobilier | UNPRO</title>
        <meta name="description" content="Posez vos questions à Alex, l'assistant IA d'UNPRO. Diagnostics, conseils, comparaisons — des réponses claires pour les propriétaires du Québec." />
        <link rel="canonical" href="https://unpro.ca/parler-a-alex" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <PageHero
          title="Parler à Alex"
          subtitle="Votre assistant IA qui comprend les problèmes de maison. Posez vos questions, obtenez des réponses claires et passez à l'action."
          compact
        />

        {/* Alex card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Alex, intelligence immobilière</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Alex analyse vos problèmes de maison, compare les solutions, estime les coûts et vous guide vers le bon professionnel. Pensé pour les propriétaires du Québec.
              </p>
              <Button size="lg" className="gap-2" onClick={() => openAlex("general")}>
                Parler maintenant <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Suggested prompts */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground font-display">Exemples de questions</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button key={prompt} onClick={() => openAlex("general")} className="text-left">
                <Card className="hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">{prompt}</span>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>

        {/* Capabilities */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: <Brain className="h-6 w-6" />, title: "Diagnostic intelligent", desc: "Décrivez un symptôme, Alex identifie les causes probables et les solutions." },
            { icon: <Zap className="h-6 w-6" />, title: "Réponses instantanées", desc: "Coûts estimés, délais, professionnels recommandés — en quelques secondes." },
            { icon: <Shield className="h-6 w-6" />, title: "Pensé pour le Québec", desc: "Normes, climat, matériaux et réalités locales intégrés dans chaque réponse." },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
              <Card className="h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="text-primary">{item.icon}</div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="gap-2" onClick={() => openAlex("general")}>
            Parler à Alex <Sparkles className="h-4 w-4" />
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to="/decrire-mon-projet">Décrire mon projet <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to="/dashboard/quotes/upload"><Upload className="h-4 w-4" /> Téléverser une photo</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
