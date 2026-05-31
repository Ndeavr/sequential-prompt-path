/**
 * UNPRO — Landing Pyrite / Dalle sous-sol
 * Route: /problemes/pyrite-sous-sol
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera, AlertTriangle, Wrench, Droplets, History, ShieldAlert,
  FlaskConical, UserCheck, Layers, ArrowRight, X, CheckCircle2,
  Hammer, Scale, HardHat, Microscope, Upload, MessageSquare, Sparkles, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import FAQSection from "@/components/shared/FAQSection";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

const FAQS = [
  {
    question: "Est-ce que la pyrite est toujours visible?",
    answer: "Non. Elle est souvent découverte après le retrait d'un plancher, d'un revêtement ou lors de fissures et soulèvements de la dalle.",
  },
  {
    question: "Un ancien patch prouve-t-il que le vendeur savait?",
    answer: "Pas automatiquement, mais c'est un indice important à documenter dans votre dossier.",
  },
  {
    question: "Dois-je appeler un entrepreneur en premier?",
    answer: "Pas toujours. Si un recours en vice caché est possible, commencez par documenter et consulter un expert pyrite ou un ingénieur.",
  },
  {
    question: "Est-ce urgent?",
    answer: "Oui, si la découverte est récente. Plus vous attendez ou modifiez les lieux, plus le dossier peut devenir difficile à défendre.",
  },
  {
    question: "UNPRO remplace-t-il un avocat?",
    answer: "Non. UNPRO vous aide à organiser les preuves, comprendre les risques et trouver les bons professionnels.",
  },
];

const CHECKS = [
  { icon: Camera, label: "Photos de la dalle" },
  { icon: AlertTriangle, label: "Fissures visibles" },
  { icon: Wrench, label: "Anciennes réparations" },
  { icon: Layers, label: "Soulèvement du béton" },
  { icon: Droplets, label: "Présence d'humidité" },
  { icon: History, label: "Historique de rénovation" },
  { icon: ShieldAlert, label: "Risque de vice caché" },
  { icon: FlaskConical, label: "Besoin d'un test pyrite" },
  { icon: UserCheck, label: "Pro à consulter" },
];

const MISTAKES = [
  "Réparer trop vite",
  "Jeter les matériaux",
  "Perdre les preuves",
  "Attendre avant d'aviser",
  "Consulter le mauvais professionnel",
];

const PROS = [
  { icon: Microscope, title: "Expert pyrite", desc: "Pour analyser le remblai sous la dalle." },
  { icon: HardHat, title: "Ingénieur", desc: "Pour évaluer le soulèvement, la structure et les risques." },
  { icon: Hammer, title: "Entrepreneur spécialisé", desc: "Pour estimer les travaux correctifs." },
  { icon: Scale, title: "Avocat en vice caché", desc: "Si le problème semble ancien, caché ou connu du vendeur." },
];

const STEPS = [
  { icon: Upload, title: "Téléversez vos photos", desc: "Dalle, fissures, anciennes réparations." },
  { icon: MessageSquare, title: "Décrivez la découverte", desc: "Quand, comment, ce que vous avez vu." },
  { icon: Sparkles, title: "Alex analyse et recommande", desc: "Signes visibles, risques, prochaine action." },
];

export default function PagePyriteSousSol() {
  const { openAlex } = useAlexVoice();
  const startAlex = () => openAlex("general", "Pyrite ou dalle de béton soulevée au sous-sol — découverte récente, besoin d'analyse photos avant rénovation.");

  return (
    <>
      <SeoHead
        title="Pyrite sous-sol Québec | Vérifier une dalle soulevée avant rénovation"
        description="Dalle fissurée, soulevée ou réparée? UNPRO vous aide à documenter le risque de pyrite, vice caché et travaux correctifs avant de rénover."
        canonical="https://unpro.ca/problemes/pyrite-sous-sol"
        lang="fr-CA"
      />
      <SchemaStack
        breadcrumbs={[
          { name: "Accueil", url: "https://unpro.ca/" },
          { name: "Problèmes", url: "https://unpro.ca/problemes" },
          { name: "Pyrite sous-sol", url: "https://unpro.ca/problemes/pyrite-sous-sol" },
        ]}
        faqs={FAQS}
      />

      <main className="min-h-screen bg-background text-foreground">
        {/* HERO */}
        <section className="relative overflow-hidden px-4 pt-16 pb-12 md:pt-24 md:pb-20">
          <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/[0.06] blur-[120px] rounded-full" />
          <div className="relative max-w-3xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Diagnostic avant rénovation</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl md:text-5xl font-bold leading-tight tracking-[-0.04em] font-display"
            >
              Pyrite dans le sous-sol?<br />
              <span className="text-muted-foreground">Ne rénovez pas avant de vérifier.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Votre dalle de béton est fissurée, soulevée ou réparée? Un plancher flottant peut cacher pendant des années un problème sérieux : pyrite, remblai gonflant, humidité ou mouvement du sol.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
            >
              <Button size="lg" onClick={startAlex} className="gap-2">
                Analyser mes photos avec Alex <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/entrepreneurs?q=pyrite">Trouver un expert pyrite</Link>
              </Button>
            </motion.div>
            <p className="text-xs text-muted-foreground/70 pt-2">
              Sans engagement · Réponse en 60 secondes · fr-CA
            </p>
          </div>
        </section>

        {/* CHECKS */}
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Diagnostic</p>
              <h2 className="text-2xl md:text-3xl font-bold font-display">Ce que UNPRO vérifie</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {CHECKS.map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl"
                >
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* MISTAKES */}
        <section className="relative px-4 py-16 md:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-amber-500/[0.04] blur-3xl" />
          <div className="relative max-w-3xl mx-auto">
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] backdrop-blur-xl p-6 md:p-10 space-y-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-400" />
                <h2 className="text-xl md:text-2xl font-bold font-display">Pourquoi agir rapidement</h2>
              </div>
              <p className="text-muted-foreground">
                Si vous venez de découvrir le problème, le temps compte. Dans un dossier potentiel de vice caché, il faut éviter de&nbsp;:
              </p>
              <ul className="space-y-2.5">
                {MISTAKES.map((m) => (
                  <li key={m} className="flex items-start gap-3 text-sm">
                    <X className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-foreground/90 border-t border-amber-500/10 pt-4">
                UNPRO vous aide à créer un dossier clair avant de prendre une mauvaise décision.
              </p>
            </div>
          </div>
        </section>

        {/* PROS */}
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Équipe recommandée</p>
              <h2 className="text-2xl md:text-3xl font-bold font-display">Professionnels recommandés selon le cas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROS.map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="p-6 bg-white/[0.03] border-white/[0.06] backdrop-blur-xl rounded-3xl space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  <button
                    onClick={startAlex}
                    className="text-sm text-primary inline-flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Voir disponibilité <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* COSTS */}
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Coûts</p>
              <h2 className="text-2xl md:text-3xl font-bold font-display">Coûts possibles</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6 bg-emerald-500/[0.04] border-emerald-500/20 rounded-3xl space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold">Diagnostic</h3>
                </div>
                <p className="text-2xl font-bold">Quelques centaines $</p>
                <p className="text-sm text-muted-foreground">Pour confirmer ou écarter le risque avant tout autre engagement.</p>
              </Card>
              <Card className="p-6 bg-white/[0.03] border-white/[0.06] backdrop-blur-xl rounded-3xl space-y-3">
                <div className="flex items-center gap-2">
                  <Hammer className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold">Correction majeure</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li>· Démolition de la dalle</li>
                  <li>· Excavation intérieure</li>
                  <li>· Remplacement du remblai</li>
                  <li>· Nouvelle dalle</li>
                  <li>· Drainage</li>
                  <li>· Finition du sous-sol</li>
                </ul>
              </Card>
            </div>
            <p className="text-center text-base md:text-lg font-medium mt-8 text-foreground/90">
              C'est pourquoi il faut <span className="text-primary">diagnostiquer avant de rénover.</span>
            </p>
          </div>
        </section>

        {/* STEPS */}
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">3 étapes</p>
              <h2 className="text-2xl md:text-3xl font-bold font-display">Commencez ici</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {STEPS.map(({ icon: Icon, title, desc }, i) => (
                <div key={title} className="relative p-6 rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <Icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center pt-10">
              <Button size="lg" onClick={startAlex} className="gap-2">
                Analyser mon sous-sol avec Alex <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <FAQSection title="Questions fréquentes" items={FAQS} />
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-4 pb-20">
          <div className="max-w-3xl mx-auto rounded-3xl border border-primary/20 bg-primary/[0.04] backdrop-blur-xl p-8 md:p-12 text-center space-y-5">
            <h2 className="text-2xl md:text-3xl font-bold font-display">Une découverte récente? Le temps compte.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Structurez les bonnes preuves et trouvez le bon expert avant de démolir, réparer ou vendre.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" onClick={startAlex} className="gap-2">
                Analyser mes photos avec Alex <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/entrepreneurs?q=pyrite">Trouver un expert pyrite</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
