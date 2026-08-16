/**
 * UNPRO — Section Pricing Propriétaires Premium
 * 3 plans: Gratuit, Plus, Gold
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
import { useHomeownerPlan, normalizeHomeownerPlanCode } from "@/features/planSystem/useHomeownerPlan";
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
  onCheckout?: () => void;
}

const PLANS: Plan[] = [
  {
    code: "homeowners_discovery",
    name: "Gratuit",
    price: 0,
    period: "/ gratuit",
    audience: "Essayez UNPRO chaque mois",
    description: "Tout le nécessaire pour une première décision, sans frais.",
    features: [
      { text: "1 propriété" },
      { text: "1 analyse de soumissions par mois", highlight: true },
      { text: "Jusqu'à 3 soumissions comparées par analyse", highlight: true },
      { text: "1 design IA par mois" },
      { text: "1 Passeport Maison" },
      { text: "Historique conservé pour votre propriété" },
    ],
    cta: "Commencer gratuitement",
    ctaLink: "/signup?redirect=/proprietaire/bienvenue?plan=discovery",
    microcopy: "Le quota se renouvelle chaque mois. Aucune carte requise.",
    icon: Home,
    badge: { label: "0 $", type: "neutral" },
  },
  {
    code: "homeowners_plus",
    name: "Plus",
    price: 49,
    period: "/ an",
    audience: "Ma maison, sans limites",
    description: "Analysez et comparez autant de soumissions que nécessaire.",
    features: [
      { text: "1 propriété" },
      { text: "Analyses de soumissions illimitées*", highlight: true },
      { text: "Jusqu'à 3 soumissions comparées par analyse" },
      { text: "10 designs IA par mois", highlight: true },
      { text: "Passeport Maison complet", highlight: true },
      { text: "Historique complet de la propriété" },
    ],
    cta: "Passer à Plus",
    ctaLink: "/auth?plan=plus",
    microcopy: "Le meilleur équilibre pour une maison.",
    icon: Sparkles,
    badge: { label: "Le plus populaire", type: "popular" },
    popular: true,
  },
  {
    code: "homeowners_signature",
    name: "Gold",
    price: 149,
    period: "/ an",
    audience: "Toutes mes propriétés, sans limites",
    description: "Pour gérer plusieurs propriétés au même endroit.",
    features: [
      { text: "Jusqu'à 3 propriétés", highlight: true },
      { text: "Analyses de soumissions illimitées*", highlight: true },
      { text: "Designs IA illimités*", highlight: true },
      { text: "Un Passeport Maison par propriété", highlight: true },
      { text: "Historique distinct pour chaque propriété" },
      { text: "Changement de propriété en un geste sur mobile" },
    ],
    cta: "Passer à Gold",
    ctaLink: "/auth?plan=signature",
    microcopy: "Pour les propriétaires de plusieurs adresses.",
    icon: Crown,
    badge: { label: "Multi-propriétés", type: "premium" },
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
  { label: "Propriétés actives", discovery: "1", plus: "1", signature: "3" },
  { label: "Analyses de soumissions", discovery: "1 / mois", plus: "Illimité*", signature: "Illimité*" },
  { label: "Soumissions par analyse", discovery: "Jusqu'à 3", plus: "Jusqu'à 3", signature: "Jusqu'à 3" },
  { label: "Designs IA", discovery: "1 / mois", plus: "10 / mois", signature: "Illimité*" },
  { label: "Passeport Maison", discovery: "1", plus: "1 enrichi", signature: "1 par propriété" },
  { label: "Estimation préliminaire de projet", discovery: "Oui", plus: "Oui", signature: "Oui" },
  { label: "Recommandations de professionnels", discovery: "Oui", plus: "Oui", signature: "Oui" },
  { label: "Vérification entrepreneur", discovery: "Base", plus: "Détaillée", signature: "Détaillée" },
  { label: "Détection d'écarts et zones floues", discovery: "Oui", plus: "Oui", signature: "Oui" },
  { label: "Historique projets et dépenses", discovery: "—", plus: "Oui", signature: "Oui" },
  { label: "Archivage avancé documents", discovery: "—", plus: "Oui", signature: "Oui" },
  { label: "Rappels d'entretien", discovery: "—", plus: "Oui", signature: "Oui" },
  { label: "Priorisation des travaux", discovery: "—", plus: "—", signature: "Oui" },
  { label: "Suggestions proactives", discovery: "—", plus: "—", signature: "Oui" },
  { label: "Support", discovery: "Standard", plus: "Prioritaire léger", signature: "Prioritaire premium" },
];

/* ─── FAQ ─── */
const FAQ = [
  { q: "Le plan Gratuit est-il vraiment gratuit ?", a: "Oui. Chaque mois vous avez droit à 1 analyse de soumissions (jusqu'à 3 soumissions comparées) et 1 design IA, sans frais et sans carte." },
  { q: "Qu'est-ce qui change avec Plus ?", a: "Plus retire la limite mensuelle d'analyses pour votre propriété et fait passer les designs IA à 10 par mois." },
  { q: "À qui s'adresse Gold ?", a: "Gold s'adresse aux propriétaires de plusieurs adresses : jusqu'à 3 propriétés, analyses et designs illimités." },
  { q: "Que se passe-t-il si je passe de Gold à Plus ?", a: "Rien n'est supprimé. Vous choisissez simplement quelle propriété reste active ; les autres passent en lecture seule et redeviennent actives dès que vous repassez à Gold." },
  { q: "Que veut dire « illimité » ?", a: "Un usage normal de propriétaire, encadré par une protection anti-abus automatique. Aucun quota mensuel ne s'applique à votre utilisation régulière." },
  { q: "Mes documents restent-ils privés ?", a: "Oui. Les documents liés à votre maison restent dans votre espace propriétaire." },
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
    popular: "bg-primary-strong text-primary-foreground border-primary-strong",
    premium: "bg-secondary/15 text-secondary-tint border-secondary/25",
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
function CardPlan({ plan, index, isCurrent }: { plan: Plan; index: number; isCurrent?: boolean }) {
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
          {isCurrent ? (
            <Button size="lg" variant="outline" className="w-full rounded-xl text-sm font-bold" disabled>
              Votre plan actuel
            </Button>
          ) : plan.price === 0 ? (
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
                  ? "shadow-glow bg-primary-strong hover:bg-primary-strong/90"
                  : isPremium
                  ? "bg-secondary-strong hover:bg-secondary-strong/90 text-secondary-foreground"
                  : ""
              }`}
            >
              {plan.cta} <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground text-center">{plan.microcopy}</p>
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
            <th className="py-3 px-3 text-xs font-semibold text-muted-foreground text-center">Gratuit</th>
            <th className="py-3 px-3 text-xs font-semibold text-primary text-center">Plus</th>
            <th className="py-3 px-3 text-xs font-semibold text-secondary text-center">Gold</th>
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
      <p className="mt-3 text-[11px] text-muted-foreground">
        * Illimité selon un usage normal de propriétaire, encadré par une protection anti-abus automatique.
      </p>
    </div>

  );
}

/* ─── Main Component ─── */
export default function HomeownerPlans() {
  const { planCode: currentPlanCode } = useHomeownerPlan();
  const [showComparison, setShowComparison] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<{ code: "plus" | "signature"; name: string; price: number } | null>(null);

  // Add onCheckout callbacks to plans
  const plansWithCheckout = PLANS.map((p) => ({
    ...p,
    onCheckout: p.price > 0 ? () => setCheckoutPlan({
      code: p.code === "homeowners_signature" ? "signature" : "plus",
      name: p.name,
      price: p.price,
    }) : undefined,
  }));

  return (
    <section className="px-5 py-16 md:py-24" id="homeowner-plans">

      {/* Checkout Drawer */}
      <HomeownerCheckoutDrawer
        open={!!checkoutPlan}
        onOpenChange={(open) => !open && setCheckoutPlan(null)}
        planCode={checkoutPlan?.code || "plus"}
        planName={checkoutPlan?.name || "Plus"}
        price={checkoutPlan?.price || 49}
      />

      {/* ─── PLAN CARDS ─── */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 md:gap-4 mb-16 md:items-stretch">
        {plansWithCheckout.map((plan, i) => (
          <CardPlan
            key={plan.code}
            plan={plan}
            index={i}
            isCurrent={normalizeHomeownerPlanCode(plan.code.replace("homeowners_", "")) === currentPlanCode && !(plan.price === 0 && currentPlanCode !== "home_decouverte")}
          />
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
          Gratuit rassure. Plus aide à décider. Gold aide à piloter plusieurs propriétés.
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
