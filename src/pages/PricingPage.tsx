/**
 * UNPRO — Pricing Page
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ArrowRight, HardHat, Home, Sparkles,
  Shield, Star, Users, MapPin, TrendingUp, Brain, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const HOMEOWNER_FEATURES = [
  "Analyse IA de 3 soumissions",
  "Score Maison complet",
  "Alex — Conseiller IA",
  "Recherche d'entrepreneurs vérifiés",
  "Prise de rendez-vous en ligne",
  "Tableau de bord propriétaire",
  "Insights propriété personnalisés",
];

const PRO_PLANS = [
  {
    name: "Recrue",
    price: "Gratuit",
    period: "",
    description: "Démarrez et explorez la plateforme.",
    features: [
      "Profil de base",
      "1 territoire",
      "5 leads / mois",
      "Score AIPP de base",
    ],
    cta: "Commencer gratuitement",
    variant: "outline" as const,
  },
  {
    name: "Premium",
    price: "99$",
    period: "/mois",
    description: "Pour les entrepreneurs en croissance.",
    features: [
      "Profil complet avec portfolio",
      "3 territoires",
      "Leads illimités",
      "Badge vérifié",
      "Score AIPP avancé",
      "Positionnement prioritaire",
    ],
    cta: "Choisir Premium",
    highlight: true,
    variant: "default" as const,
  },
  {
    name: "Élite",
    price: "249$",
    period: "/mois",
    description: "Dominez votre marché.",
    features: [
      "Tout Premium inclus",
      "Territoires exclusifs",
      "Position #1 garantie",
      "Support dédié",
      "Analyse de concurrence",
      "Tableau de bord avancé",
    ],
    cta: "Choisir Élite",
    variant: "secondary" as const,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-[-10%] left-[-15%] w-[40vw] h-[40vw] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 text-center px-5 pt-28 pb-12 md:pt-36 md:pb-16">
          <motion.div className="space-y-4 max-w-lg mx-auto" initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} custom={0} className="text-hero-sm md:text-hero text-foreground">
              Tarification <span className="text-gradient">simple et transparente</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="text-body text-muted-foreground max-w-sm mx-auto">
              Gratuit pour les propriétaires. Plans flexibles pour les entrepreneurs.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Homeowner — Always Free ── */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="glass-card-elevated rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="relative flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-body font-bold text-foreground">Propriétaires</h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-title font-extrabold text-foreground">Gratuit</span>
                    <span className="text-caption text-muted-foreground">pour toujours</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6">
                {HOMEOWNER_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span className="text-meta text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" className="w-full rounded-xl">
                <Link to="/signup">Créer mon compte gratuit <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Contractor Plans ── */}
      <section className="px-5 py-10 relative">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-secondary/8 text-secondary text-caption font-semibold mb-3">
              <HardHat className="h-3 w-3" /> Pour les professionnels
            </div>
            <h2 className="text-section text-foreground">Choisissez votre plan</h2>
            <p className="text-meta text-muted-foreground mt-1">Commencez gratuitement, évoluez à votre rythme.</p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-4"
          >
            {PRO_PLANS.map((plan, i) => (
              <motion.div key={plan.name} variants={fadeUp} custom={i}>
                <div className={`rounded-2xl p-5 ${
                  plan.highlight
                    ? "pricing-highlight bg-card shadow-elevated"
                    : "glass-card"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-body font-bold text-foreground">{plan.name}</h3>
                        {plan.highlight && (
                          <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-caption">Populaire</Badge>
                        )}
                      </div>
                      <p className="text-caption text-muted-foreground mt-0.5">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-title font-extrabold text-foreground">{plan.price}</span>
                      {plan.period && <span className="text-caption text-muted-foreground">{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        <span className="text-meta text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    size="lg"
                    variant={plan.highlight ? "default" : plan.variant}
                    className={`w-full rounded-xl ${plan.highlight ? "shadow-glow" : ""}`}
                  >
                    <Link to="/signup">{plan.cta}</Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <h2 className="text-section text-foreground">Questions fréquentes</h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-3"
          >
            {[
              { q: "C'est vraiment gratuit pour les propriétaires ?", a: "Oui. L'analyse de soumissions, le Score Maison et la recherche d'entrepreneurs sont 100% gratuits et le resteront." },
              { q: "Puis-je changer de plan à tout moment ?", a: "Absolument. Vous pouvez upgrader ou downgrader votre plan sans frais cachés." },
              { q: "Comment fonctionne le badge vérifié ?", a: "Notre équipe vérifie vos licences RBQ, assurances et références. Le badge apparaît sur votre profil public." },
              { q: "Qu'est-ce qu'un territoire exclusif ?", a: "Un territoire est une combinaison ville + catégorie de service avec un nombre limité de places pour garantir la visibilité." },
            ].map((faq, i) => (
              <motion.div key={faq.q} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-5">
                  <p className="text-meta font-bold text-foreground mb-1.5">{faq.q}</p>
                  <p className="text-meta text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-5 py-14">
        <div className="max-w-lg mx-auto text-center space-y-5">
          <Sparkles className="h-8 w-8 text-primary mx-auto" />
          <h2 className="text-section text-foreground">Prêt à commencer?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="rounded-2xl h-12">
              <Link to="/signup">Créer mon compte gratuit <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="rounded-2xl h-12">
              <Link to="/signup">Inscrire mon entreprise <HardHat className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
