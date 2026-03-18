/**
 * UNPRO — Contractor Availability by Category, Specialty, Cluster & City
 * Premium explanatory + conversion page
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Users, MapPin, Target, Lock, TrendingUp,
  ChevronDown, Check, X, AlertTriangle, Crown,
  Building2, Sparkles, ArrowRight, Layers, Star,
  Search, Zap, Eye, Clock, ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ─── Translations ─── */
const FAQS = [
  {
    q: "Pourquoi limitez-vous le nombre d'entrepreneurs ?",
    a: "Pour protéger la visibilité de chaque professionnel et garantir des rendez-vous de qualité. Un réseau ouvert à tous dilue les opportunités et détruit la confiance.",
  },
  {
    q: "La limite est-elle par ville ou par spécialité ?",
    a: "Par les deux. Chaque créneau est défini par la combinaison Catégorie × Spécialité × Cluster géographique. Un couvreur en membranes à Laval et un couvreur en bardeaux à Terrebonne occupent deux places distinctes.",
  },
  {
    q: "Deux entrepreneurs du même métier dans la même ville, c'est possible ?",
    a: "Oui, si leurs spécialités sont différentes ou si la capacité du cluster le permet. Le système est conçu pour maintenir un équilibre sain entre l'offre et la demande.",
  },
  {
    q: "Est-ce premier arrivé, premier servi ?",
    a: "La priorité est donnée aux entrepreneurs qui complètent leur vérification et leur profil en premier. Une fois qu'un segment est plein, les nouveaux candidats sont placés sur liste prioritaire.",
  },
  {
    q: "Que se passe-t-il si mon segment est complet ?",
    a: "Vous êtes ajouté à la liste prioritaire. Dès qu'une place se libère ou qu'un nouveau cluster est ouvert, vous êtes notifié en premier. Aucun frais n'est requis pour être sur la liste.",
  },
  {
    q: "En quoi c'est mieux qu'un répertoire classique ?",
    a: "Un répertoire classique accepte tout le monde et ne garantit rien. UNPRO limite, vérifie et distribue les opportunités de manière intelligente. Moins de bruit, plus de résultats.",
  },
];

const STATUS_EXAMPLES = [
  { label: "Ouvert", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: Check, desc: "Places disponibles" },
  { label: "Places limitées", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: AlertTriangle, desc: "Quelques places restantes" },
  { label: "Presque complet", color: "bg-orange-500/15 text-orange-400 border-orange-500/20", icon: Clock, desc: "Dernières places" },
  { label: "Liste prioritaire", color: "bg-rose-500/15 text-rose-400 border-rose-500/20", icon: Lock, desc: "Inscription sur liste d'attente" },
];

const SPECIALTIES = [
  { cat: "Toiture", specs: ["Bardeaux d'asphalte", "Membrane TPO/EPDM", "Toiture plate", "Réparation d'urgence", "Inspection"] },
  { cat: "Isolation", specs: ["Cellulose", "Uréthane giclé", "Laine minérale", "Polystyrène", "Pare-vapeur"] },
  { cat: "Excavation", specs: ["Drain français", "Fondation", "Terrassement", "Imperméabilisation", "Nivelage"] },
  { cat: "Électricité", specs: ["Résidentiel", "Panneau 200A", "Domotique", "Borne de recharge", "Urgence"] },
];

const CLUSTERS = [
  { name: "Laval", cities: ["Laval", "Sainte-Rose", "Duvernay", "Chomedey"] },
  { name: "Rive-Nord Est", cities: ["Terrebonne", "Mascouche", "Lachenaie", "Les Moulins"] },
  { name: "Rive-Sud Centre", cities: ["Longueuil", "Boucherville", "Saint-Hubert", "Saint-Bruno"] },
  { name: "Montréal Centre", cities: ["Plateau", "Rosemont", "Villeray", "Mile-End"] },
  { name: "Montréal Ouest", cities: ["Lachine", "Dorval", "Pointe-Claire", "Dollard-des-Ormeaux"] },
];

const COMPARISON = [
  { feature: "Profils illimités", dir: true, unpro: false },
  { feature: "Visibilité garantie", dir: false, unpro: true },
  { feature: "Rendez-vous qualifiés", dir: false, unpro: true },
  { feature: "Guerre de prix", dir: true, unpro: false },
  { feature: "Vérification obligatoire", dir: false, unpro: true },
  { feature: "Territoire protégé", dir: false, unpro: true },
  { feature: "Matching par spécialité", dir: false, unpro: true },
];

/* ─── Animations ─── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
};

/* ─── FAQ Schema ─── */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

/* ─── Component ─── */
export default function ContractorAvailabilityPage() {
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  return (
    <MainLayout>
      <Helmet>
        <title>Disponibilité par catégorie, spécialité et ville | UNPRO</title>
        <meta
          name="description"
          content="UNPRO limite volontairement le nombre d'entrepreneurs par métier, spécialité, cluster et ville. Vérifiez si votre place est encore disponible dans votre secteur."
        />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs/disponibilite-categorie-specialite-ville" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen premium-bg">
        {/* ═══════ HERO ═══════ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
            <motion.div {...fadeUp}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 gap-1.5">
                <Shield className="h-3 w-3" />
                Réseau protégé
              </Badge>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-[1.15] max-w-4xl mx-auto">
                Les places sont limitées par{" "}
                <span className="text-gradient">métier, spécialité, cluster et ville.</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                UNPRO protège la qualité du réseau en limitant volontairement le nombre d'entrepreneurs par segment.
                Vérifiez si votre place est encore disponible dans votre secteur.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                <Button size="xl" className="gap-2 cta-gradient rounded-xl" asChild>
                  <a href="#verifier">
                    <Search className="h-4 w-4" />
                    Vérifier ma disponibilité
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2 rounded-xl" asChild>
                  <a href="#logique">
                    Comprendre la logique
                    <ChevronDown className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Status badges preview */}
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-2 mt-10"
            >
              {STATUS_EXAMPLES.map((s) => (
                <div
                  key={s.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${s.color}`}
                >
                  <s.icon className="h-3 w-3" />
                  {s.label}
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════ WHY WE LIMIT ═══════ */}
        <section id="logique" className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="section-label">Pourquoi limiter ?</p>
            <h2 className="section-title">
              Un réseau ouvert à tous ne protège personne.
            </h2>
            <p className="section-desc">
              Les répertoires classiques acceptent des milliers de profils. Le résultat : personne ne reçoit assez de visibilité, et les clients sont submergés de choix médiocres.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Eye, title: "Visibilité diluée", desc: "Plus de profils = moins de visibilité pour chacun. Vos investissements ne rapportent rien." },
              { icon: TrendingUp, title: "Opportunités fragmentées", desc: "Les rendez-vous sont distribués à trop de monde. Personne n'en reçoit suffisamment." },
              { icon: Users, title: "Mauvaise expérience client", desc: "Trop de choix paralyse le propriétaire. Il ne sait plus qui choisir et abandonne." },
              { icon: Zap, title: "Guerre de prix", desc: "La compétition excessive pousse les prix vers le bas. Les bons entrepreneurs perdent." },
              { icon: Shield, title: "Confiance affaiblie", desc: "Sans limite ni vérification, la qualité moyenne du réseau s'effondre." },
              { icon: Lock, title: "Aucune exclusivité", desc: "Chaque professionnel est interchangeable. Aucun avantage à être présent." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="glass-card-elevated p-5 rounded-2xl"
              >
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                  <item.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ COMPARISON ═══════ */}
        <section className="max-w-3xl mx-auto px-4 pb-16 sm:pb-24">
          <motion.div {...fadeUp} className="glass-card-elevated rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 text-center">
              <div className="p-4 border-b border-r border-border" />
              <div className="p-4 border-b border-r border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Répertoire classique</p>
              </div>
              <div className="p-4 border-b border-border bg-primary/5">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">UNPRO</p>
              </div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 text-center ${i < COMPARISON.length - 1 ? "border-b border-border/50" : ""}`}>
                <div className="p-3 text-left flex items-center">
                  <span className="text-xs text-foreground font-medium">{row.feature}</span>
                </div>
                <div className="p-3 flex items-center justify-center border-x border-border/30">
                  {row.dir ? (
                    <Check className="h-4 w-4 text-muted-foreground/40" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/20" />
                  )}
                </div>
                <div className="p-3 flex items-center justify-center bg-primary/3">
                  {row.unpro ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/20" />
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ═══════ CATEGORY VS SPECIALTY ═══════ */}
        <section className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <div className="absolute inset-0 section-gradient rounded-3xl -mx-4 sm:-mx-8" />
          <div className="relative">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="section-label">Catégorie ≠ Spécialité</p>
              <h2 className="section-title">
                « Toiture » n'est pas un seul métier.
              </h2>
              <p className="section-desc">
                Le jumelage UNPRO repose sur la spécialité exacte, pas sur une catégorie vague.
                Un couvreur en membranes et un couvreur en bardeaux ne font pas le même travail.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
              {SPECIALTIES.map((group, gi) => (
                <motion.div
                  key={group.cat}
                  {...stagger}
                  transition={{ duration: 0.4, delay: gi * 0.08 }}
                  className="glass-card-elevated p-5 rounded-2xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-foreground text-sm">{group.cat}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.specs.map((spec) => (
                      <span
                        key={spec}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-muted/60 border border-border/30 text-muted-foreground font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.p {...fadeUp} className="text-center text-xs text-muted-foreground mt-8 max-w-lg mx-auto">
              Chaque spécialité possède sa propre capacité. Un segment peut être ouvert pour les membranes mais complet pour les bardeaux dans le même cluster.
            </motion.p>
          </div>
        </section>

        {/* ═══════ CITY + CLUSTER ═══════ */}
        <section className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="section-label">Clusters géographiques</p>
            <h2 className="section-title">
              Au-delà de la ville : le cluster intelligent.
            </h2>
            <p className="section-desc">
              Certaines zones géographiques sont gérées par clusters pour un meilleur équilibre territorial,
              une exclusivité plus intelligente et une distribution de rendez-vous plus pertinente.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CLUSTERS.map((cluster, ci) => (
              <motion.div
                key={cluster.name}
                {...stagger}
                transition={{ duration: 0.4, delay: ci * 0.06 }}
                className="glass-card-elevated p-4 rounded-2xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-accent" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-sm">{cluster.name}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cluster.cities.map((city) => (
                    <span
                      key={city}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 border border-border/20 text-muted-foreground"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            {...fadeUp}
            className="mt-8 grid sm:grid-cols-3 gap-3"
          >
            {[
              { icon: Target, title: "Équilibre territorial", desc: "Les rendez-vous sont distribués proportionnellement." },
              { icon: Crown, title: "Exclusivité contrôlée", desc: "Chaque cluster a sa propre capacité maximale." },
              { icon: Star, title: "Pertinence accrue", desc: "Les clients sont jumelés avec des pros proches." },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/10">
                <b.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{b.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ═══════ PROTECTS CONTRACTORS ═══════ */}
        <section className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <div className="absolute inset-0 section-gradient rounded-3xl -mx-4 sm:-mx-8" />
          <div className="relative">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="section-label">Pour les entrepreneurs</p>
              <h2 className="section-title">Ce que la limitation protège pour vous.</h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Eye, title: "Visibilité préservée", desc: "Votre profil n'est pas noyé parmi des centaines de concurrents." },
                { icon: Sparkles, title: "Rendez-vous de qualité", desc: "Moins de profils signifie des rendez-vous mieux qualifiés pour vous." },
                { icon: TrendingUp, title: "Meilleur positionnement", desc: "Vous êtes présenté comme un spécialiste, pas un profil parmi d'autres." },
                { icon: Shield, title: "Moins de compétition interne", desc: "Vous ne vous battez pas contre 20 concurrents sur chaque projet." },
                { icon: Crown, title: "Présence à haute valeur", desc: "Être sur UNPRO signifie quelque chose. C'est une sélection, pas un listing." },
                { icon: Lock, title: "Territoire protégé", desc: "Votre zone + spécialité = votre espace réservé." },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  {...stagger}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="glass-card-elevated p-5 rounded-2xl"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ HOMEOWNER BENEFIT ═══════ */}
        <section className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="section-label">Pour les propriétaires</p>
            <h2 className="section-title">Le bon entrepreneur, pas trop de choix.</h2>
            <p className="section-desc">
              Les propriétaires veulent le bon professionnel pour leur projet.
              Pas une liste de 50 noms sans garantie.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { icon: Target, label: "Matching précis" },
              { icon: Zap, label: "Moins de friction" },
              { icon: Clock, label: "Temps économisé" },
              { icon: Shield, label: "Plus de confiance" },
              { icon: Star, label: "Meilleurs résultats" },
            ].map((b, i) => (
              <motion.div
                key={b.label}
                {...stagger}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="flex flex-col items-center gap-2 p-5 rounded-2xl glass-card-elevated text-center"
              >
                <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-success" />
                </div>
                <span className="text-xs font-semibold text-foreground">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ AVAILABILITY CHECK ═══════ */}
        <section id="verifier" className="max-w-3xl mx-auto px-4 py-16 sm:py-24">
          <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-8 sm:p-12 shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/8 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative text-center mb-8">
              <Badge className="mb-4 bg-warning/10 text-warning border-warning/20 text-xs px-3 py-1 gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Places limitées
              </Badge>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Vérifiez si votre place est encore disponible
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
                Chaque place dépend de votre catégorie, spécialité, cluster et ville.
                Certaines niches sont encore ouvertes, d'autres sont limitées ou presque pleines.
              </p>
            </div>

            <div className="relative grid sm:grid-cols-2 gap-3 mb-6">
              <div>
                <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Catégorie</label>
                <select
                  value={selectedCat}
                  onChange={(e) => { setSelectedCat(e.target.value); setSelectedSpec(""); }}
                  className="w-full rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s.cat} value={s.cat}>{s.cat}</option>
                  ))}
                  <option value="Plomberie">Plomberie</option>
                  <option value="Fenêtres">Fenêtres</option>
                  <option value="Notaire">Notaire</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Spécialité</label>
                <select
                  value={selectedSpec}
                  onChange={(e) => setSelectedSpec(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {(SPECIALTIES.find((s) => s.cat === selectedCat)?.specs || []).map((sp) => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Ville</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {CLUSTERS.flatMap((c) => c.cities).sort().map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Cluster</label>
                <select
                  className="w-full rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none"
                  value={CLUSTERS.find((c) => c.cities.includes(selectedCity))?.name || ""}
                  disabled
                >
                  <option value="">{selectedCity ? (CLUSTERS.find((c) => c.cities.includes(selectedCity))?.name || "Automatique") : "Détecté automatiquement"}</option>
                </select>
              </div>
            </div>

            <Button size="xl" className="w-full gap-2 cta-gradient rounded-xl" asChild>
              <Link to="/contractor-onboarding">
                <Search className="h-4 w-4" />
                Vérifier ma place
              </Link>
            </Button>
          </motion.div>
        </section>

        {/* ═══════ SCARCITY STATUSES ═══════ */}
        <section className="max-w-4xl mx-auto px-4 pb-16 sm:pb-24">
          <motion.div {...fadeUp} className="text-center mb-10">
            <p className="section-label">Niveaux de disponibilité</p>
            <h2 className="section-title">Chaque segment a son propre statut.</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STATUS_EXAMPLES.map((s, i) => (
              <motion.div
                key={s.label}
                {...stagger}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="glass-card-elevated p-5 rounded-2xl text-center"
              >
                <div className={`mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-3 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="font-display font-bold text-foreground text-sm mb-1">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section className="max-w-3xl mx-auto px-4 py-16 sm:py-24">
          <motion.div {...fadeUp} className="text-center mb-10">
            <p className="section-label">Questions fréquentes</p>
            <h2 className="section-title">Tout ce que vous devez savoir.</h2>
          </motion.div>

          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="space-y-2">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="glass-card-elevated rounded-xl border border-border/40 px-5 overflow-hidden"
                >
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4 text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </section>

        {/* ═══════ FINAL CTA ═══════ */}
        <section className="max-w-3xl mx-auto px-4 pb-20 sm:pb-28">
          <motion.div
            {...fadeUp}
            className="text-center p-8 sm:p-12 rounded-3xl glass-card-elevated border-primary/15"
          >
            <Crown className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">
              Votre place dans le réseau UNPRO
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Les meilleurs segments se remplissent. Vérifiez votre disponibilité et sécurisez votre position avant qu'il ne soit trop tard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="xl" className="gap-2 cta-gradient rounded-xl" asChild>
                <Link to="/contractor-onboarding">
                  Vérifier ma disponibilité
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 rounded-xl" asChild>
                <Link to="/pricing">
                  Voir les plans
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Internal links for SEO */}
        <nav className="max-w-3xl mx-auto px-4 pb-12 text-center space-x-4">
          <Link to="/pricing" className="text-xs text-muted-foreground hover:text-primary transition-colors">Plans et tarifs</Link>
          <Link to="/contractor-onboarding" className="text-xs text-muted-foreground hover:text-primary transition-colors">Inscription entrepreneur</Link>
          <Link to="/verifier-entrepreneur" className="text-xs text-muted-foreground hover:text-primary transition-colors">Vérifier un entrepreneur</Link>
          <Link to="/entrepreneurs" className="text-xs text-muted-foreground hover:text-primary transition-colors">Professionnels</Link>
        </nav>
      </div>

      {/* ═══════ STICKY MOBILE CTA ═══════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-background via-background/95 to-transparent sm:hidden safe-area-bottom">
        <Button size="lg" className="w-full gap-2 cta-gradient rounded-xl" asChild>
          <Link to="/contractor-onboarding">
            <Search className="h-4 w-4" />
            Vérifier ma disponibilité
          </Link>
        </Button>
      </div>
    </MainLayout>
  );
}