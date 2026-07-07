/**
 * PageHomeVariantB — Second homepage variant for A/B test.
 * Narrative: "Le meilleur entrepreneur n'est pas toujours le plus visible."
 */
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Megaphone,
  Monitor,
  Search,
  Trophy,
  Sparkles,
  MapPin,
  Wallet,
  Clock,
  ShieldCheck,
  Activity,
  MessageCircle,
  Brain,
  Star,
  UploadCloud,
  Building2,
  Users,
  Award,
  FileCheck,
  History,
  Target,
  CalendarCheck,
  ArrowRight,
  Check,
  X,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

function trackCta(key: string, section: string) {
  try {
    supabase
      .from("entrepreneur_cta_events")
      .insert({
        visitor_id: crypto.randomUUID(),
        cta_key: `home_b_${key}`,
        page_section: section,
      })
      .then(() => {})
      .then(undefined, () => {});
  } catch {}
}

const NOT_RECOMMEND = [
  { icon: Megaphone, text: "dépense le plus en publicité" },
  { icon: Monitor, text: "possède le plus beau site web" },
  { icon: Search, text: "apparaît premier sur Google" },
  { icon: Trophy, text: "achète le plus de leads" },
];

const RECOMMEND = [
  { icon: Sparkles, text: "Expertise adaptée à votre projet" },
  { icon: MapPin, text: "Dessert votre secteur" },
  { icon: Wallet, text: "Correspond à votre budget" },
  { icon: Clock, text: "Disponible dans vos délais" },
  { icon: ShieldCheck, text: "Certifications et assurances" },
  { icon: Activity, text: "Performance réelle vérifiée" },
];

const STEPS = [
  {
    icon: MessageCircle,
    title: "Décrivez votre projet",
    body:
      "Parlez à Alex ou remplissez quelques informations simples. Adresse, type de propriété, budget, objectifs, photos, etc.",
  },
  {
    icon: Brain,
    title: "L'IA analyse votre situation",
    body:
      "UNPRO analyse votre projet, l'urgence, votre budget, la localisation et les contraintes pour comprendre vos besoins.",
  },
  {
    icon: ShieldCheck,
    title: "Vérification des entrepreneurs",
    body:
      "Nous vérifions la RBQ, les assurances, l'historique, les spécialisations, le territoire desservi, la disponibilité et la réputation.",
  },
  {
    icon: Star,
    title: "Recommandation intelligente",
    body:
      "Vous obtenez un entrepreneur qui correspond réellement à votre situation. Pas juste une liste. Une recommandation.",
  },
];

const QUOTE_BULLETS = [
  "Les différences importantes",
  "Les éléments manquants",
  "Les risques potentiels",
  "Les garanties",
  "Les matériaux proposés",
  "Les écarts de prix",
];

const NETWORK = [
  { icon: ShieldCheck, label: "RBQ vérifiée" },
  { icon: FileCheck, label: "Assurances validées" },
  { icon: History, label: "Antécédents analysés" },
  { icon: Star, label: "Réputation évaluée" },
  { icon: Activity, label: "Performance mesurée" },
  { icon: Target, label: "Spécialisation validée" },
  { icon: MapPin, label: "Territoire desservi" },
  { icon: CalendarCheck, label: "Disponibilités confirmées" },
];

const FAQ = [
  {
    q: "Est-ce gratuit ?",
    a: "Oui. Vous pouvez commencer gratuitement.",
  },
  {
    q: "Dois-je obtenir trois soumissions ?",
    a: "Pas nécessairement. L'objectif est de trouver le bon entrepreneur, pas simplement d'accumuler des prix.",
  },
  {
    q: "Comment les entrepreneurs sont-ils sélectionnés ?",
    a: "Selon la compatibilité avec votre projet et plusieurs critères de qualité et de confiance.",
  },
  {
    q: "UNPRO favorise-t-il les entreprises qui paient le plus ?",
    a: "Non. Le système est conçu pour recommander l'entrepreneur le plus adapté à votre situation.",
  },
];

export default function PageHomeVariantB() {
  const navigate = useNavigate();

  const goAlex = useCallback(
    (section: string) => {
      trackCta("alex", section);
      navigate("/alex");
    },
    [navigate],
  );
  const goPassport = useCallback(
    (section: string) => {
      trackCta("passport", section);
      navigate("/ia-maison");
    },
    [navigate],
  );

  return (
    <>
      <Helmet>
        <title>UNPRO — Le meilleur entrepreneur n'est pas toujours le plus visible</title>
        <meta
          name="description"
          content="UNPRO recommande le meilleur entrepreneur pour votre situation. Pas le plus visible. Pas le plus cher en publicité. Le bon."
        />
        <link rel="canonical" href="https://unpro.ca/" />
      </Helmet>

      <main className="min-h-screen bg-background pb-28 lg:pb-0">
        {/* ============ HERO (dark) ============ */}
        <section className="alex-immersive relative overflow-hidden text-white">
          <div className="absolute inset-0 -z-10 bg-[#050816]" />
          <div className="absolute -top-32 -left-24 -z-10 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[140px]" />
          <div className="absolute -bottom-32 -right-24 -z-10 h-[520px] w-[520px] rounded-full bg-sky-500/15 blur-[140px]" />

          <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:pt-24 md:pb-20 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            <motion.div initial="hidden" animate="show" className="space-y-6">
              <motion.h1
                variants={fadeUp}
                custom={0}
                className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-[-0.02em]"
              >
                Le meilleur entrepreneur n'est pas toujours{" "}
                <span className="text-sky-400">le plus visible.</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={1}
                className="text-lg md:text-xl text-sky-300 font-medium"
              >
                UNPRO recommande le meilleur entrepreneur pour votre situation.
              </motion.p>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-base md:text-lg text-white/80 leading-relaxed max-w-xl"
              >
                Nous analysons votre projet, votre propriété, votre budget, votre région et vos
                besoins afin de vous connecter avec l'entrepreneur qui correspond réellement à
                votre situation.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => goAlex("hero")}
                  className="h-14 rounded-2xl px-6 text-base font-semibold shadow-glow bg-primary hover:bg-primary/90"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  <span className="flex flex-col items-start leading-tight">
                    <span>Parler à Alex</span>
                    <span className="text-[11px] font-normal opacity-80">
                      Recommandation en 2 minutes
                    </span>
                  </span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => goPassport("hero")}
                  className="h-14 rounded-2xl px-6 text-base border-white/30 bg-white/5 text-white hover:bg-white/10"
                >
                  Créer mon Passeport Maison
                </Button>
              </motion.div>

              <motion.div
                variants={fadeUp}
                custom={4}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-sm text-white/70"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-4 w-4" /> Gratuit et sans obligation
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> 100% confidentiel
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="h-4 w-4" /> Experts vérifiés
                </span>
              </motion.div>
            </motion.div>

            {/* Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="relative mt-12 lg:mt-0 hidden md:block"
            >
              <div className="relative mx-auto aspect-[4/5] max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-2xl">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-glow">
                  Correspondance · 96%
                </div>
                <div className="h-full w-full rounded-2xl bg-gradient-to-br from-sky-500/20 to-primary/20 flex flex-col items-center justify-center gap-4 p-6">
                  <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
                    <Users className="h-10 w-10 text-sky-300" />
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center gap-0.5 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-white">Correspondance idéale</p>
                  </div>
                  <ul className="w-full space-y-2 text-sm text-white/85">
                    {[
                      "Projet compatible",
                      "Budget compatible",
                      "Région compatible",
                      "Disponibilités compatibles",
                      "Performance vérifiée",
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============ CONTRAST ============ */}
        <section className="bg-background py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wider text-rose-600 text-center mb-6">
                UNPRO ne recommande pas
              </h2>
              <ul className="space-y-3">
                {NOT_RECOMMEND.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="relative h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-rose-500" />
                      <X className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white p-0.5" />
                    </div>
                    <span className="text-sm text-foreground">L'entrepreneur qui {text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wider text-primary text-center mb-2">
                UNPRO recommande
              </h2>
              <p className="text-center text-sm text-muted-foreground mb-6">
                Le meilleur entrepreneur pour votre situation
              </p>
              <ul className="grid grid-cols-2 gap-3">
                {RECOMMEND.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-foreground leading-tight">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-12">
              Comment <span className="text-primary">UNPRO</span> fonctionne
            </h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: i * 0.08, duration: 0.45 }}
                  className="relative rounded-3xl border border-border bg-card p-6 text-center"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shadow-md">
                    {i + 1}
                  </div>
                  <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ QUOTE ANALYSIS ============ */}
        <section className="bg-background py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 grid gap-10 md:grid-cols-2 items-center">
            <div className="order-2 md:order-1 rounded-3xl bg-gradient-to-br from-primary/90 to-primary p-10 text-center text-white shadow-xl">
              <UploadCloud className="mx-auto h-12 w-12 mb-4 opacity-90" />
              <p className="font-semibold mb-1">Glissez vos fichiers ici</p>
              <p className="text-sm opacity-80">ou cliquez pour téléverser</p>
              <p className="text-xs opacity-70 mt-3">PDF, JPG, PNG acceptés</p>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                Déjà reçu des soumissions ?
              </h2>
              <p className="text-muted-foreground mb-6">
                Téléversez-les. UNPRO les analyse pour vous.
              </p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
                {QUOTE_BULLETS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl bg-primary/8 border border-primary/20 p-4 flex items-start gap-3">
                <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Avant que vous signiez.</p>
                  <p className="text-sm text-muted-foreground">Comprenez ce que vous achetez.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ DIFFERENTIATION ============ */}
        <section className="bg-muted/30 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-10">
              Ce qui rend <span className="text-primary">UNPRO</span> différent
            </h2>
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-3xl border border-border bg-card p-6">
                <Building2 className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">Les annuaires</h3>
                <p className="text-sm text-muted-foreground mb-4">Vous donnent une liste d'entrepreneurs.</p>
                <ul className="space-y-2 text-sm">
                  {["Aucun contexte", "Aucune vérification approfondie", "À vous de décider seul"].map(
                    (t) => (
                      <li key={t} className="flex items-center gap-2 text-muted-foreground">
                        <X className="h-4 w-4 text-rose-500 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6">
                <Users className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">Les plateformes de soumissions</h3>
                <p className="text-sm text-muted-foreground mb-4">Vous vendent à plusieurs entrepreneurs.</p>
                <ul className="space-y-2 text-sm">
                  {["Leads partagés", "Approche de volume", "Vous recevez des appels incessants"].map(
                    (t) => (
                      <li key={t} className="flex items-center gap-2 text-muted-foreground">
                        <X className="h-4 w-4 text-rose-500 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div className="alex-immersive relative rounded-3xl border border-primary/40 bg-[#050816] p-6 text-white shadow-glow">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/15 to-sky-500/10 -z-0 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-sm">
                      U
                    </div>
                    <span className="font-bold tracking-wide">UNPRO</span>
                  </div>
                  <p className="text-sm text-white/80 mb-4">
                    Vous aide à prendre une meilleure décision.
                  </p>
                  <ul className="space-y-2 text-sm">
                    {[
                      "Recommandation intelligente",
                      "Entrepreneurs vérifiés",
                      "Adapté à VOTRE situation",
                      "Moins de bruit, plus de clarté",
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ VERIFIED NETWORK ============ */}
        <section className="bg-background py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground mb-8">
              Un réseau d'entrepreneurs vérifiés
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {NETWORK.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div className="h-12 w-12 rounded-xl border border-border bg-card flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground leading-tight">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="bg-muted/30 py-16 md:py-20">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-8">
              Questions fréquentes
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {FAQ.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="rounded-2xl border border-border bg-card px-5"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ============ FINAL CTA (dark) ============ */}
        <section className="alex-immersive relative overflow-hidden text-white">
          <div className="absolute inset-0 -z-10 bg-[#050816]" />
          <div className="absolute -top-20 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24 grid gap-8 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
                Votre projet mérite mieux qu'une recommandation au hasard.
              </h2>
              <p className="text-white/75 text-base md:text-lg">
                Découvrez quel entrepreneur correspond réellement à votre situation.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button
                size="lg"
                onClick={() => goAlex("final")}
                className="h-14 rounded-2xl px-6 text-base font-semibold shadow-glow bg-primary hover:bg-primary/90"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                <span className="flex flex-col items-start leading-tight">
                  <span>Parler à Alex</span>
                  <span className="text-[11px] font-normal opacity-80">
                    Recommandation en 2 minutes
                  </span>
                </span>
              </Button>
              <button
                onClick={() => goPassport("final")}
                className="text-sm text-white/80 hover:text-white inline-flex items-center gap-1"
              >
                ou créer mon Passeport Intelligence Maison <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <p className="text-xs text-white/60">
                Gratuit · Sans obligation · 100% confidentiel
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-xl p-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)]">
        <Button
          onClick={() => goAlex("sticky_mobile")}
          className="w-full h-13 rounded-2xl text-base font-semibold shadow-glow"
        >
          <MessageCircle className="mr-2 h-5 w-5" /> Parler à Alex
        </Button>
      </div>
    </>
  );
}
