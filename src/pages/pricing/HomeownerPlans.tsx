/**
 * UNPRO — Section Pricing Propriétaires Premium
 * 3 plans: Découverte, Plus, Signature
 * Ultra premium, mobile-first, licorne design
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Home, Sparkles, Crown, ArrowRight, Shield,
  FileSearch, Eye, FolderOpen, AlertTriangle, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import HomeownerCheckoutDrawer from "@/components/pricing/HomeownerCheckoutDrawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ─── Plan Data (static, Supabase-ready swap later) ─── */

interface PlanFeature {
  text: string;
  highlight?: boolean;
}

interface Plan {
  code: string;
  name: string;
  price: number;
  period: string;
  audience: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  ctaLink: string;
  microcopy: string;
  icon: typeof Home;
  badge?: { label: string; type: "popular" | "premium" | "neutral" };
  popular?: boolean;
  premium?: boolean;
}

const PLANS: Plan[] = [
  {
    code: "homeowners_discovery",
    name: "Découverte",
    price: 0,
    period: "/ gratuit",
    audience: "Pour commencer sans friction",
    description: "Les bases pour vérifier, comprendre et avancer.",
    features: [
      { text: "1 compte propriétaire UNPRO" },
      { text: "1 Passeport Maison" },
      { text: "Estimation préliminaire de projet" },
      { text: "Recommandations de professionnels compatibles" },
      { text: "Vérification de base d'un entrepreneur" },
      { text: "1 analyse de soumission par mois" },
      { text: "Stockage de documents essentiels" },
      { text: "Suivi de projet simple" },
      { text: "Accès à Alex pour orientation de base" },
    ],
    cta: "Commencer gratuitement",
    ctaLink: "/auth",
    microcopy: "Idéal pour un premier projet ou un besoin ponctuel.",
    icon: Home,
    badge: { label: "Gratuit pour commencer", type: "neutral" },
  },
  {
    code: "homeowners_plus",
    name: "Plus",
    price: 49,
    period: "/ an",
    audience: "Pour comparer intelligemment",
    description: "Comparez mieux, évitez les erreurs coûteuses et centralisez votre maison.",
    features: [
      { text: "Tout dans Découverte", highlight: false },
      { text: "Jusqu'à 3 adresses", highlight: true },
      { text: "Passeport Maison enrichi", highlight: true },
      { text: "Analyses de soumissions illimitées", highlight: true },
      { text: "Comparaison intelligente de jusqu'à 3 soumissions", highlight: true },
      { text: "Détection d'écarts, d'oublis possibles et de zones floues", highlight: true },
      { text: "Vérifications entrepreneur plus détaillées", highlight: true },
      { text: "Historique de projets et dépenses" },
      { text: "Rappels d'entretien" },
      { text: "Classement et archivage avancé des documents" },
      { text: "Recommandations plus précises selon budget, urgence et type de projet" },
      { text: "Support prioritaire léger" },
    ],
    cta: "Passer à Plus",
    ctaLink: "/auth?plan=plus",
    microcopy: "Le meilleur équilibre entre clarté, protection et valeur.",
    icon: Sparkles,
    badge: { label: "Le plus populaire", type: "popular" },
    popular: true,
  },
  {
    code: "homeowners_signature",
    name: "Signature",
    price: 149,
    period: "/ an",
    audience: "Pour piloter votre maison avec plus de contrôle",
    description: "Une expérience premium avec copilote maison plus stratégique.",
    features: [
      { text: "Tout dans Plus", highlight: false },
      { text: "Jusqu'à 5 adresses", highlight: true },
      { text: "Analyses prioritaires", highlight: true },
      { text: "Accompagnement Alex avancé", highlight: true },
      { text: "Lecture plus stratégique des soumissions et options", highlight: true },
      { text: "Priorisation des travaux selon risque, valeur et urgence", highlight: true },
      { text: "Vue consolidée maison, documents, projets et entrepreneurs", highlight: true },
      { text: "Espace documentaire premium" },
      { text: "Préparation simplifiée avant vente, refinancement ou sinistre" },
      { text: "Suggestions proactives liées à l'entretien, aux risques visibles et aux prochaines étapes", highlight: true },
      { text: "Support prioritaire premium" },
    ],
    cta: "Activer Signature",
    ctaLink: "/auth?plan=signature",
    microcopy: "Pour les propriétaires exigeants qui veulent une vraie longueur d'avance.",
    icon: Crown,
    badge: { label: "Premium", type: "premium" },
    premium: true,
  },
];

/* ─── Comparison Features ─── */
interface ComparisonRow {
  label: string;
  discovery: string;
  plus: string;
  signature: string;
}

const COMPARISON: ComparisonRow[] = [
  { label: "Compte propriétaire UNPRO", discovery: "Oui", plus: "Oui", signature: "Oui" },
  { label: "Adresses (propriétés)", discovery: "1", plus: "Jusqu'à 3", signature: "Jusqu'à 5" },
  { label: "Passeport Maison", discovery: "1", plus: "1 enrichi", signature: "1 enrichi" },
  { label: "Estimation préliminaire de projet", discovery: "Oui", plus: "Oui", signature: "Oui" },
  { label: "Recommandations de professionnels", discovery: "Oui", plus: "Oui", signature: "Oui" },
  { label: "Vérification entrepreneur", discovery: "Base", plus: "Détaillée", signature: "Détaillée" },
  { label: "Analyse de soumission", discovery: "1 / mois", plus: "Illimité", signature: "Illimité prioritaire" },
  { label: "Comparaison de jusqu'à 3 soumissions", discovery: "—", plus: "Oui", signature: "Oui" },
  { label: "Détection d'écarts et zones floues", discovery: "—", plus: "Oui", signature: "Oui" },
  { label: "Historique projets et dépenses", discovery: "—", plus: "Oui", signature: "Oui" },
  { label: "Archivage avancé documents", discovery: "—", plus: "Oui", signature: "Oui" },
  { label: "Rappels d'entretien", discovery: "—", plus: "Oui", signature: "Oui" },
  { label: "Lecture stratégique des options", discovery: "—", plus: "—", signature: "Oui" },
  { label: "Priorisation des travaux", discovery: "—", plus: "—", signature: "Oui" },
  { label: "Suggestions proactives", discovery: "—", plus: "—", signature: "Oui" },
  { label: "Support", discovery: "Standard", plus: "Prioritaire léger", signature: "Prioritaire premium" },
];

/* ─── FAQ ─── */
const FAQ = [
  { q: "Le plan Découverte est-il vraiment gratuit ?", a: "Oui. Vous pouvez créer votre compte et utiliser les fonctionnalités de base sans frais." },
  { q: "Qu'est-ce qui change surtout avec Plus ?", a: "Plus débloque les analyses illimitées, la comparaison de soumissions et une meilleure organisation du Passeport Maison." },
  { q: "À qui s'adresse Signature ?", a: "Signature s'adresse aux propriétaires qui veulent une expérience plus premium, plus proactive et plus stratégique." },
  { q: "Puis-je changer de plan plus tard ?", a: "Oui. Vous pouvez passer à un plan supérieur lorsque vos besoins évoluent." },
  { q: "Mes documents restent-ils privés ?", a: "Oui. Les documents liés à votre maison restent dans votre espace propriétaire." },
  { q: "UNPRO remplace-t-il mon jugement ?", a: "Non. UNPRO vous aide à mieux comprendre, mieux comparer et mieux décider. La décision finale reste toujours la vôtre." },
];

/* ─── Why Pay Blocks ─── */
const WHY_PAY = [
  { icon: AlertTriangle, title: "Évitez les erreurs coûteuses", text: "Repérez les écarts, les oublis et les zones floues avant de signer." },
  { icon: FolderOpen, title: "Gardez le contrôle", text: "Centralisez documents, historique et décisions au même endroit." },
  { icon: Eye, title: "Avancez avec plus de confiance", text: "Choisissez avec plus de clarté, moins de bruit, moins d'hésitation." },
];

/* ─── Badge Component ─── */
function PlanBadge({ label, type }: { label: string; type: "popular" | "premium" | "neutral" }) {
  const styles = {
    popular: "bg-primary/15 text-primary border-primary/25",
    premium: "bg-secondary/15 text-secondary border-secondary/25",
    neutral: "bg-muted text-muted-foreground border-border/50",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${styles[type]}`}>
      {label}
    </span>
  );
}

/* ─── Feature Value Cell ─── */
function FeatureValue({ value, highlight }: { value: string; highlight?: boolean }) {
  if (value === "Oui") return <CheckCircle2 className={`h-4 w-4 ${highlight ? "text-primary" : "text-success"}`} />;
  if (value === "—" || value === "Non") return <span className="text-muted-foreground/40">—</span>;
  return <span className={`text-xs ${highlight ? "text-primary font-semibold" : "text-foreground"}`}>{value}</span>;
}

/* ─── Plan Card ─── */
function CardPlan({ plan, index }: { plan: Plan; index: number }) {
  const Icon = plan.icon;
  const isPopular = plan.popular;
  const isPremium = plan.premium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="h-full"
    >
      <div
        className={`
          relative h-full flex flex-col rounded-2xl p-6 md:p-7 transition-all duration-300
          ${isPopular
            ? "border-2 border-primary/30 bg-card/80 shadow-glow md:scale-[1.03] md:-my-2 z-10"
            : isPremium
            ? "border border-secondary/20 bg-card/60"
            : "border border-border/40 bg-card/40"
          }
        `}
        style={{
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        {/* Top gradient line */}
        {isPopular && (
          <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-primary via-accent to-secondary" />
        )}
        {isPremium && (
          <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-secondary via-primary to-accent" />
        )}

        {/* Badge */}
        {plan.badge && (
          <div className="mb-4">
            <PlanBadge label={plan.badge.label} type={plan.badge.type} />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            isPopular ? "bg-primary/12" : isPremium ? "bg-secondary/12" : "bg-muted"
          }`}>
            <Icon className={`h-5 w-5 ${isPopular ? "text-primary" : isPremium ? "text-secondary" : "text-foreground"}`} />
          </div>
          <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
        </div>

        {/* Audience */}
        <p className="text-xs text-muted-foreground mb-4">{plan.audience}</p>

        {/* Price */}
        <div className="mb-1">
          <span className="text-4xl font-extrabold text-foreground">{plan.price} $</span>
          <span className="text-muted-foreground text-sm ml-1.5">{plan.period}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{plan.description}</p>

        {/* Features */}
        <ul className="space-y-2.5 mb-6 flex-1">
          {plan.features.map((f) => (
            <li key={f.text} className="flex items-start gap-2.5">
              <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${
                f.highlight ? "text-primary" : "text-success/70"
              }`} />
              <span className={`text-sm leading-snug ${
                f.highlight ? "text-foreground font-medium" : "text-muted-foreground"
              }`}>
                {f.text}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto space-y-2">
          {plan.price === 0 ? (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full rounded-xl text-sm font-bold"
            >
              <Link to={plan.ctaLink}>
                {plan.cta} <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              variant="default"
              onClick={() => plan.onCheckout?.()}
              className={`w-full rounded-xl text-sm font-bold ${
                isPopular
                  ? "shadow-glow bg-primary hover:bg-primary/90"
                  : isPremium
                  ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  : ""
              }`}
            >
              {plan.cta} <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground/70 text-center">{plan.microcopy}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Comparison Table ─── */
function ComparisonMatrix() {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[600px] text-left">
        <thead>
          <tr className="border-b border-border/30">
            <th className="py-3 pr-4 text-xs font-semibold text-muted-foreground w-[40%]">Fonctionnalité</th>
            <th className="py-3 px-3 text-xs font-semibold text-muted-foreground text-center">Découverte</th>
            <th className="py-3 px-3 text-xs font-semibold text-primary text-center">Plus</th>
            <th className="py-3 px-3 text-xs font-semibold text-secondary text-center">Signature</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map((row, i) => (
            <tr key={row.label} className={`border-b border-border/10 ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
              <td className="py-2.5 pr-4 text-xs text-foreground">{row.label}</td>
              <td className="py-2.5 px-3 text-center"><FeatureValue value={row.discovery} /></td>
              <td className="py-2.5 px-3 text-center bg-primary/[0.02]"><FeatureValue value={row.plus} highlight /></td>
              <td className="py-2.5 px-3 text-center bg-secondary/[0.02]"><FeatureValue value={row.signature} highlight /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Component ─── */
export default function HomeownerPlans() {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <section className="px-5 py-16 md:py-24" id="homeowner-plans">

      {/* ─── PLAN CARDS ─── */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 md:gap-4 mb-16 md:items-stretch">
        {PLANS.map((plan, i) => (
          <CardPlan key={plan.code} plan={plan} index={i} />
        ))}
      </div>

      {/* ─── REASSURANCE BANNER ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto mb-16"
      >
        <div className="rounded-2xl border border-warning/15 bg-warning/[0.04] p-5 md:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-warning" />
            <span className="text-sm font-bold text-foreground">Protection contre les erreurs</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Une mauvaise décision coûte souvent beaucoup plus cher qu'un abonnement. UNPRO vous aide à mieux comprendre avant d'avancer.
          </p>
        </div>
      </motion.div>

      {/* ─── WHY PAY ─── */}
      <div className="max-w-4xl mx-auto mb-16">
        <motion.h3
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8"
        >
          Pourquoi passer à un plan propriétaire ?
        </motion.h3>
        <div className="grid md:grid-cols-3 gap-5">
          {WHY_PAY.map(({ icon: WIcon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border/30 bg-card/40 p-5 text-center"
              style={{ backdropFilter: "blur(10px)" }}
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <WIcon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-bold text-foreground text-sm mb-1.5">{title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── VALUE STACK ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center mb-16"
      >
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          Découverte rassure. Plus aide à décider. Signature aide à piloter.
        </h3>
        <p className="text-sm text-muted-foreground">
          Chaque plan augmente votre niveau de clarté, de structure et de contrôle.
        </p>
      </motion.div>

      {/* ─── COMPARISON MATRIX ─── */}
      <div id="comparison-matrix" className="max-w-4xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-foreground">Comparez les plans en un coup d'œil</h3>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border/30 bg-card/30 p-4 md:p-6"
          style={{ backdropFilter: "blur(10px)" }}
        >
          <ComparisonMatrix />
        </motion.div>
      </div>

      {/* ─── FAQ ─── */}
      <div className="max-w-2xl mx-auto mb-16">
        <motion.h3
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-bold text-foreground text-center mb-6"
        >
          Questions fréquentes
        </motion.h3>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQ.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-border/30 bg-card/30 px-5 data-[state=open]:bg-card/50 transition-colors"
            >
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* ─── FINAL CTA ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto text-center"
      >
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Commencez avec les bases. Passez à un niveau supérieur quand vous êtes prêt.
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Créez votre espace propriétaire UNPRO et avancez avec plus de clarté dès aujourd'hui.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-xl shadow-glow px-8">
            <Link to="/signup">Commencer gratuitement <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="rounded-xl text-muted-foreground"
            onClick={() => document.getElementById("comparison-matrix")?.scrollIntoView({ behavior: "smooth" })}
          >
            Comparer les plans
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
