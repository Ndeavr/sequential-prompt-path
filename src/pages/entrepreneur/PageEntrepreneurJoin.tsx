/**
 * /entrepreneurs/rejoindre — Contractor Join Landing Page
 * Hero + How it Works + CTA → Guided by Alex
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  Sparkles, CalendarCheck, TrendingUp, Shield, CheckCircle2,
  ArrowRight, Mic, MessageSquare, Star, Zap,
} from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

const STEPS = [
  { icon: MessageSquare, title: "Parlez avec Alex", desc: "Dites le nom de votre entreprise. Alex s'occupe du reste." },
  { icon: Sparkles, title: "Profil créé par l'IA", desc: "Import automatique depuis Google, votre site web et les registres publics." },
  { icon: CalendarCheck, title: "Territoires et catégories", desc: "Choisissez où et quoi. Visibilité activée en quelques clics." },
  { icon: TrendingUp, title: "Recevez des rendez-vous", desc: "Pas des leads. Des rendez-vous qualifiés, directement dans votre agenda." },
];

const VALUE_PROPS = [
  { icon: Shield, label: "Vérifié et scoré" },
  { icon: Star, label: "Profil public premium" },
  { icon: Zap, label: "Matching intelligent" },
  { icon: CalendarCheck, label: "Rendez-vous, pas des leads" },
];

export default function PageEntrepreneurJoin() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();

  return (
    <>
      <Helmet>
        <title>Rejoindre UNPRO — Activez votre présence professionnelle</title>
        <meta name="description" content="Créez votre profil UNPRO en quelques minutes. Import automatique, scoring IA, rendez-vous qualifiés. Commencez gratuitement." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-card to-background">
          <div className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Places limitées par territoire
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1, duration: 0.5 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight"
            >
              Soyez sur UNPRO.
              <br />
              <span className="text-primary">Commencez à recevoir les bons projets.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Parlez avec Alex. Nous construisons votre profil, activons votre visibilité
              et vous guidons étape par étape.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                className="gap-2 text-base px-8 py-6 rounded-xl shadow-lg"
                onClick={() => openAlex("contractor_onboarding")}
              >
                <Mic className="h-5 w-5" />
                Parler avec Alex
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base px-8 py-6 rounded-xl"
                onClick={() => navigate("/entrepreneur")}
              >
                Commencer sans la voix
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* Value pills */}
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-12 flex flex-wrap justify-center gap-3"
            >
              {VALUE_PROPS.map((v) => (
                <span key={v.label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground">
                  <v.icon className="h-4 w-4 text-primary" />
                  {v.label}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-20 bg-background">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="font-display text-3xl font-bold text-center text-foreground mb-16">
              Comment ça fonctionne
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="relative rounded-2xl border border-border bg-card p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-3 left-4 text-xs font-bold text-primary bg-background px-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── What you get ── */}
        <section className="py-20 bg-card">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="font-display text-3xl font-bold text-center text-foreground mb-12">
              Ce que vous recevez
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: "Rendez-vous qualifiés", desc: "Pas des leads froids. Des propriétaires prêts, dans votre zone." },
                { title: "Profil public premium", desc: "Page publique optimisée pour Google et les moteurs IA." },
                { title: "Score AIPP transparent", desc: "Votre score de visibilité IA, avec des recommandations claires." },
                { title: "Exclusivité territoriale", desc: "Places limitées par territoire. Votre visibilité protégée." },
                { title: "Dashboard complet", desc: "Rendez-vous, score, visibilité, facturation — tout en un." },
                { title: "Alex, votre copilote", desc: "Assistant IA disponible 24/7 pour optimiser votre présence." },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="flex gap-4 rounded-xl border border-border bg-background p-5"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="py-20 bg-background">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Prêt à activer votre présence?
            </h2>
            <p className="text-muted-foreground mb-8">
              L'activation prend moins de 5 minutes. Alex fait le gros du travail.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="gap-2 text-base px-8 py-6 rounded-xl shadow-lg"
                onClick={() => openAlex("contractor_onboarding")}
              >
                <Mic className="h-5 w-5" />
                Parler avec Alex
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base px-8 py-6 rounded-xl"
                onClick={() => navigate("/entrepreneur")}
              >
                Commencer maintenant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
