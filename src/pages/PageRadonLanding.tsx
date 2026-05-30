/**
 * UNPRO — /radon Landing
 * Premium FR landing page for radon awareness, testing, and mitigation.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Wind, Home, ShieldCheck, FileSearch, Wrench, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SeoHead from "@/seo/components/SeoHead";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { trackFunnelEvent } from "@/utils/trackFunnelEvent";
import radonHero from "@/assets/radon-hero.jpg";

const FAQS = [
  {
    question: "Qu'est-ce que le radon ?",
    answer:
      "Le radon est un gaz radioactif naturel, invisible et inodore, qui provient du sol. Il peut s'infiltrer dans les maisons par les fondations, les fissures, les vides sanitaires et les drains. C'est la deuxième cause de cancer du poumon au Canada après le tabac.",
    topics: ["radon"],
  },
  {
    question: "Quel est le seuil recommandé au Canada ?",
    answer:
      "Santé Canada recommande d'agir lorsque la concentration de radon dépasse 200 Bq/m³ dans une zone normalement occupée d'une maison. Au-delà de ce seuil, des mesures correctives sont fortement recommandées.",
    topics: ["radon"],
  },
  {
    question: "Combien coûte un test de radon ?",
    answer:
      "Un test à long terme (90 jours minimum) coûte généralement entre 50$ et 150$ pour un dosimètre, ou de 250$ à 500$ pour un test professionnel encadré. UNPRO vous met en relation avec un mesureur certifié au Québec.",
    topics: ["radon"],
  },
  {
    question: "Que faire si mon niveau de radon est élevé ?",
    answer:
      "Si votre résultat dépasse 200 Bq/m³, parlez à un mitigateur radon certifié C-NRPP. Les solutions vont de l'amélioration de la ventilation à l'installation d'un système de dépressurisation active du sol. UNPRO recommande un entrepreneur qualifié et conserve rapport, facture et garantie dans votre Passeport Maison.",
    topics: ["radon"],
  },
  {
    question: "UNPRO couvre-t-il toutes les régions du Québec ?",
    answer:
      "Oui. UNPRO opère uniquement au Québec et couvre les grandes régions urbaines et plusieurs régions rurales. Selon votre ville, un test à distance par dosimètre ou une intervention sur place vous sera proposée.",
    topics: ["radon"],
  },
];

const ALEX_STEPS = [
  "Quelle propriété ?",
  "Sous-sol habité ou non ?",
  "Année de construction ?",
  "Avez-vous déjà un test radon ?",
  "Voulez-vous tester ou corriger ?",
];

const OFFERS = [
  {
    id: "radon_test",
    icon: ShieldCheck,
    title: "Test radon résidentiel",
    desc: "Pour savoir si votre maison dépasse la ligne directrice de 200 Bq/m³.",
    href: "/onboarding?intent=radon_test&utm_source=radon_landing",
  },
  {
    id: "radon_report",
    icon: FileSearch,
    title: "Analyse de rapport existant",
    desc: "Téléversez votre résultat. Alex vous explique exactement quoi faire.",
    href: "/onboarding?intent=radon_report_analysis&utm_source=radon_landing",
  },
  {
    id: "radon_mitigation",
    icon: Wrench,
    title: "Correction / mitigation radon",
    desc: "Si votre niveau est élevé, UNPRO recommande un entrepreneur qualifié.",
    href: "/onboarding?intent=radon_mitigation&utm_source=radon_landing",
  },
];

const WHY_UNPRO = [
  "Comprendre votre niveau de risque",
  "Réserver un test",
  "Comparer les résultats",
  "Recommandation d'un pro si correction requise",
  "Rapport, photos, facture et garantie dans votre Passeport Maison",
];

const MICROCOPY = ["Résultat clair", "Entrepreneur qualifié", "Suivi dans le Passeport Maison", "Québec seulement"];

export default function PageRadonLanding() {
  const { openAlex } = useAlexVoice();

  useEffect(() => {
    trackFunnelEvent("radon_landing_view" as never, { path: "/radon" });
  }, []);

  const handleAlex = (source: string) => {
    trackFunnelEvent("radon_cta_alex" as never, { source });
    openAlex("radon");
  };

  const handleOfferClick = (id: string) => {
    trackFunnelEvent("radon_offer_click" as never, { offer: id });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Test et correction du radon au Québec — UNPRO"
        description="Radon dans votre maison ? Faites mesurer, comprendre et corriger sans deviner. Test radon résidentiel, analyse de rapport et mitigation par entrepreneur qualifié au Québec."
        canonical="https://unpro.ca/radon"
        ogImage={radonHero}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={radonHero}
            alt="Sous-sol résidentiel avec un détecteur de radon"
            width={1536}
            height={1024}
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        </div>

        <div className="mx-auto max-w-3xl px-5 pt-16 pb-12 md:pt-24 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
              <Wind className="h-3 w-3" />
              Radon · Québec
            </span>

            <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight font-display">
              Radon dans votre maison ?<br />
              <span className="text-primary">Faites mesurer, comprendre et corriger</span> sans deviner.
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Le radon est invisible, inodore et impossible à détecter sans test. Au Canada, la ligne directrice est de
              200 Bq/m³ ; au-delà, des mesures correctives sont recommandées.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={() => handleAlex("hero")}>
                Vérifier mon risque avec Alex <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link
                  to="/onboarding?intent=radon_test&utm_source=radon_landing"
                  onClick={() => handleOfferClick("radon_test_hero")}
                >
                  Réserver un test radon
                </Link>
              </Button>
            </div>

            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-4 text-sm text-muted-foreground">
              {MICROCOPY.map((m) => (
                <li key={m} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {m}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Pourquoi agir */}
      <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Pourquoi agir</h2>
        <p className="text-muted-foreground leading-relaxed">
          Le radon peut s'accumuler dans les sous-sols, vides sanitaires et maisons étanches. Le seul moyen fiable de
          savoir est de mesurer.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Home, label: "Sous-sols" },
            { icon: Wind, label: "Vides sanitaires" },
            { icon: ShieldCheck, label: "Maisons étanches" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-2xl border border-border/60 bg-card/40 p-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ce que UNPRO fait */}
      <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ce que UNPRO fait</h2>
        <p className="text-muted-foreground mb-6">UNPRO vous aide à :</p>
        <ul className="space-y-3">
          {WHY_UNPRO.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <span className="text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Offres */}
      <section className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Nos offres radon</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OFFERS.map(({ id, icon: Icon, title, desc, href }) => (
            <Card key={id} className="p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground flex-1">{desc}</p>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link to={href} onClick={() => handleOfferClick(id)}>
                  Commencer <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Flow Alex */}
      <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Comment Alex vous guide</h2>
        <p className="text-muted-foreground mb-6">5 questions courtes. Pas de formulaire.</p>
        <ol className="space-y-3">
          {ALEX_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-primary/15 text-primary font-semibold text-sm flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-foreground pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Bloc confiance */}
      <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <div className="rounded-3xl border border-border/60 bg-card/40 p-6 md:p-8 space-y-4">
          <h2 className="text-2xl font-bold">Ne choisissez pas au hasard</h2>
          <p className="text-muted-foreground leading-relaxed">
            Le radon demande une lecture sérieuse : résultat, type de fondation, ventilation, sous-sol, fissures, drain,
            puis solution adaptée.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {["Fondation", "Ventilation", "Fissures", "Drain"].map((label) => (
              <div key={label} className="rounded-xl border border-border/40 bg-background/40 px-3 py-2 text-center text-xs text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <SeoFaqSection faqs={FAQS} heading="Questions fréquentes sur le radon" />
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-8 md:p-10 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Parlez à Alex maintenant</h2>
          <p className="text-muted-foreground italic">« Je veux vérifier le radon dans ma maison. »</p>
          <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={() => handleAlex("final_cta")}>
            Vérifier mon risque avec Alex <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
