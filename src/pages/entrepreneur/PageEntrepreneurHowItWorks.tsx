/**
 * /entrepreneurs/comment-ca-marche — How UNPRO works for contractors
 */
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Search, Sparkles, MapPin, CalendarCheck, TrendingUp,
  Shield, Star, ArrowRight, Mic,
} from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const DETAILED_STEPS = [
  {
    icon: Search,
    title: "1. On trouve votre entreprise",
    desc: "Dites le nom de votre entreprise à Alex ou entrez-le. On cherche automatiquement sur Google Business, votre site web et les registres publics pour pré-remplir votre profil.",
  },
  {
    icon: Sparkles,
    title: "2. L'IA construit votre profil",
    desc: "Catégories, description, territoires — tout est pré-rempli intelligemment. Vous validez ou ajustez en quelques clics.",
  },
  {
    icon: MapPin,
    title: "3. Vous choisissez vos territoires",
    desc: "Sélectionnez les villes et quartiers que vous desservez. UNPRO protège votre visibilité avec des places limitées par zone.",
  },
  {
    icon: CalendarCheck,
    title: "4. Vous recevez des rendez-vous",
    desc: "Pas des leads froids partagés. Des propriétaires qualifiés, prêts à discuter, directement dans votre agenda.",
  },
  {
    icon: TrendingUp,
    title: "5. Votre présence grandit",
    desc: "Profil public optimisé SEO, score AIPP transparent, avis vérifiés. Plus vous performez, plus vous êtes visible.",
  },
  {
    icon: Shield,
    title: "6. Confiance intégrée",
    desc: "Vérification RBQ, assurances, certifications. Chaque signal de confiance renforce votre profil automatiquement.",
  },
];

export default function PageEntrepreneurHowItWorks() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();

  return (
    <>
      <Helmet>
        <title>Comment ça marche — UNPRO pour entrepreneurs</title>
        <meta name="description" content="Découvrez comment UNPRO aide les entrepreneurs à recevoir des rendez-vous qualifiés grâce à l'IA, des profils vérifiés et une visibilité protégée." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible"
            className="font-display text-4xl sm:text-5xl font-bold text-foreground text-center mb-4"
          >
            Comment ça marche
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-16"
          >
            De l'inscription à votre premier rendez-vous, en moins de 5 minutes.
          </motion.p>

          <div className="space-y-8">
            {DETAILED_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Comparison */}
          <div className="mt-20">
            <h2 className="font-display text-2xl font-bold text-foreground text-center mb-8">
              Pourquoi pas 3 soumissions?
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
                <h3 className="font-semibold text-destructive mb-4">L'ancien modèle</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">❌ Leads froids partagés avec 3-4 concurrents</li>
                  <li className="flex gap-2">❌ Courses au plus bas prix</li>
                  <li className="flex gap-2">❌ Visibilité payée au clic sans garantie</li>
                  <li className="flex gap-2">❌ Aucune différenciation qualitative</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <h3 className="font-semibold text-primary mb-4">UNPRO</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2"><Star className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Rendez-vous exclusifs, un seul entrepreneur recommandé</li>
                  <li className="flex gap-2"><Star className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Matching basé sur la compatibilité réelle</li>
                  <li className="flex gap-2"><Star className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Profil vérifié et scoré publiquement</li>
                  <li className="flex gap-2"><Star className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Revenus récurrents et prévisibles</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2 px-8 py-6 rounded-xl" onClick={() => openAlex("contractor_onboarding")}>
                <Mic className="h-5 w-5" /> Parler avec Alex
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8 py-6 rounded-xl" onClick={() => navigate("/entrepreneur")}>
                Commencer maintenant <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
