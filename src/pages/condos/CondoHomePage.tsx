/**
 * UNPRO Condos — Public Home Page
 * Premium SaaS landing for condominium management
 */
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Building2, Shield, FileText, PiggyBank, Wrench, Users,
  CheckCircle2, ArrowRight, BarChart3, Clock, AlertTriangle,
  ChevronDown, Star, Zap, Lock, TrendingUp, Calendar,
  FolderOpen, Search, Award
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const } }),
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const problems = [
  { icon: AlertTriangle, text: "Cotisations spéciales imprévues de 10 000 $ et plus", color: "text-destructive" },
  { icon: FileText, text: "Documents éparpillés entre courriels, classeurs et clés USB", color: "text-warning" },
  { icon: Users, text: "Rotation des administrateurs bénévoles sans transfert de dossier", color: "text-muted-foreground" },
  { icon: Clock, text: "Non-conformité à la Loi 16 sans le savoir", color: "text-destructive" },
  { icon: PiggyBank, text: "Fonds de prévoyance insuffisant pour les travaux à venir", color: "text-warning" },
];

const features = [
  { icon: Building2, title: "Profil immeuble", desc: "Identité complète de votre copropriété en un seul endroit" },
  { icon: Wrench, title: "Inventaire composantes", desc: "Suivi du cycle de vie de chaque composante du bâtiment" },
  { icon: Calendar, title: "Calendrier d'entretien", desc: "Planification et suivi des interventions préventives" },
  { icon: FolderOpen, title: "Coffre-fort documents", desc: "Stockage sécurisé de tous les documents du syndicat" },
  { icon: Shield, title: "Conformité Loi 16", desc: "Checklist de conformité et suivi des obligations légales" },
  { icon: BarChart3, title: "Score de santé", desc: "Évaluation intelligente de l'état de votre immeuble" },
  { icon: PiggyBank, title: "Projections fonds", desc: "Modélisation du fonds de prévoyance sur 25 ans" },
  { icon: Search, title: "Analyse soumissions", desc: "Comparaison intelligente des soumissions d'entrepreneurs" },
];

const freeFeatures = [
  "Profil immeuble complet",
  "Inventaire des composantes",
  "Journal de maintenance",
  "Calendrier d'entretien",
  "Stockage de documents",
  "Registre du syndicat",
  "Administrateurs illimités",
  "Checklist Loi 16",
  "Exports de base",
];

const premiumFeatures = [
  "Score de santé immeuble",
  "Prévisions de maintenance",
  "Projections fonds de prévoyance",
  "Analyse de soumissions IA",
  "Recherche intelligente documents",
  "Professionnels recommandés",
  "Rapports avancés",
  "Support prioritaire",
];

const faqs = [
  { q: "Qu'est-ce que le Passeport Immeuble?", a: "C'est le profil numérique complet de votre copropriété : composantes, historique d'entretien, documents, fonds de prévoyance et intelligence de bâtiment. Tout en un seul endroit sécurisé." },
  { q: "Est-ce vraiment gratuit?", a: "Oui. Le plan Passeport Immeuble Gratuit inclut toutes les fonctionnalités essentielles sans limite de temps. Le plan Premium ajoute l'intelligence artificielle et les projections avancées." },
  { q: "Combien de temps pour configurer?", a: "Moins de 5 minutes. Entrez l'adresse, le nombre d'unités et les composantes principales. UNPRO génère immédiatement votre checklist Loi 16 et vos suggestions d'entretien." },
  { q: "Nos données sont-elles sécurisées?", a: "Absolument. Toutes les données sont chiffrées, stockées au Canada, et accessibles uniquement aux membres autorisés de votre syndicat avec contrôle d'accès par rôle." },
  { q: "La Loi 16, c'est quoi exactement?", a: "La Loi 16 oblige les syndicats de copropriété du Québec à obtenir une étude du fonds de prévoyance, un carnet d'entretien et un plan de gestion de l'actif. UNPRO vous aide à suivre votre conformité." },
];

const CondoHomePage = () => {
  return (
    <MainLayout>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary border-primary/20 font-medium">
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                Passeport Immeuble Intelligent
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Le système intelligent pour{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                gérer et protéger
              </span>{" "}
              votre copropriété.
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Centralisez vos documents, suivez vos composantes, planifiez l'entretien et assurez la conformité à la Loi 16 — gratuitement.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="rounded-xl px-8 h-12 text-base font-semibold shadow-glow">
                <Link to="/condos/onboarding">
                  <Building2 className="h-5 w-5 mr-2" /> Créer mon Passeport Immeuble
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl px-8 h-12 text-base">
                <Link to="/condos/tarifs">
                  Voir la démo <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </motion.div>

            <motion.p variants={fadeUp} custom={4} className="text-sm text-muted-foreground mt-4">
              Gratuit pour toujours · Aucune carte de crédit requise
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl sm:text-3xl font-bold mb-4">
              La gestion de copropriété est un cauchemar administratif
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-xl mx-auto">
              Chaque année, des milliers de syndicats font face aux mêmes problèmes.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((p, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <Card className="border-border/40 bg-card/80 hover:shadow-md transition-shadow">
                  <CardContent className="flex items-start gap-3 p-5">
                    <div className="h-9 w-9 rounded-xl bg-destructive/8 flex items-center justify-center flex-shrink-0">
                      <p.icon className={`h-4.5 w-4.5 ${p.color}`} />
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{p.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ SOLUTION ═══ */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-4 bg-success/10 text-success border-success/20">Solution</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Le Passeport Immeuble : tout au même endroit
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-xl mx-auto">
              Un système complet conçu spécifiquement pour les copropriétés québécoises.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <Card className="h-full border-border/40 bg-card/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-sm mb-1.5">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ LOI 16 ═══ */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeUp} custom={0}>
                <Badge className="mb-4 bg-warning/10 text-warning border-warning/20">
                  <Shield className="h-3 w-3 mr-1" /> Conformité légale
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="font-display text-2xl sm:text-3xl font-bold mb-4">
                Loi 16 : êtes-vous conforme?
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground mb-6 leading-relaxed">
                Depuis 2020, la Loi 16 impose aux syndicats de copropriété du Québec de maintenir un carnet d'entretien,
                une étude du fonds de prévoyance et un plan de gestion de l'actif. UNPRO Condos automatise le suivi de votre conformité.
              </motion.p>
              <motion.div variants={fadeUp} custom={3}>
                <Button asChild className="rounded-xl">
                  <Link to="/condos/loi-16">
                    En savoir plus sur la Loi 16 <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <Card className="border-border/40 bg-card/90">
                <CardContent className="p-6 space-y-3">
                  {["Étude du fonds de prévoyance", "Carnet d'entretien à jour", "Plan de gestion de l'actif", "Registre de copropriété", "Attestation du syndicat"].map((item, i) => (
                    <motion.div key={i} variants={fadeUp} custom={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                      <span className="text-sm font-medium">{item}</span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ FREE vs PREMIUM ═══ */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Gratuit pour commencer, Premium pour aller plus loin
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="h-full border-border/40 bg-card/90">
                <CardContent className="p-6">
                  <h3 className="font-display font-bold text-lg mb-1">Passeport Immeuble</h3>
                  <p className="text-2xl font-display font-bold text-primary mb-4">Gratuit <span className="text-sm font-normal text-muted-foreground">pour toujours</span></p>
                  <div className="space-y-2.5">
                    {freeFeatures.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full mt-6 rounded-xl" variant="outline">
                    <Link to="/condos/onboarding">Commencer gratuitement</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <Card className="h-full border-primary/30 bg-card/90 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-lg">UNPRO Condos Premium</h3>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Populaire</Badge>
                  </div>
                  <p className="text-2xl font-display font-bold text-primary mb-1">À partir de 150 $ <span className="text-sm font-normal text-muted-foreground">/ an</span></p>
                  <p className="text-xs text-muted-foreground mb-4">Taxes incluses · Selon le nombre d'unités</p>
                  <div className="space-y-2.5">
                    {premiumFeatures.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full mt-6 rounded-xl shadow-glow">
                    <Link to="/condos/tarifs">Voir les tarifs <ArrowRight className="h-4 w-4 ml-2" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="font-display text-2xl sm:text-3xl font-bold text-center mb-12">
            Ils font confiance à UNPRO Condos
          </motion.h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { name: "Marie-Claude B.", role: "Administratrice, 24 unités", quote: "On est enfin passé d'Excel à un vrai système. La checklist Loi 16 nous a sauvé beaucoup de stress." },
              { name: "Jean-François L.", role: "Gestionnaire immobilier", quote: "Je gère 8 syndicats avec UNPRO. Les projections de fonds de prévoyance sont un game changer." },
              { name: "Sophie T.", role: "Membre du CA, 48 unités", quote: "L'analyse de soumissions nous a permis d'économiser 15 000 $ sur notre projet de toiture." },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="h-full border-border/40 bg-card/80">
                  <CardContent className="p-5">
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-warning text-warning" />)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">"{t.quote}"</p>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between p-4 rounded-xl bg-card/80 border border-border/40 cursor-pointer hover:bg-card transition-colors">
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-2xl sm:text-4xl font-bold mb-4">
            Prêt à moderniser la gestion de votre copropriété?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Créez votre Passeport Immeuble en moins de 5 minutes. C'est gratuit, sécurisé et conçu pour le Québec.
          </p>
          <Button asChild size="lg" className="rounded-xl px-10 h-13 text-base font-semibold shadow-glow">
            <Link to="/condos/onboarding">
              <Building2 className="h-5 w-5 mr-2" /> Créer mon Passeport Immeuble
            </Link>
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};

export default CondoHomePage;
