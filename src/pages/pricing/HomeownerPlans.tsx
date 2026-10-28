/**
 * UNPRO — Section Pricing Propriétaires Premium
 * 3 plans: Gratuit, Plus, Gold
 * Ultra premium, mobile-first, licorne design
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Home, Sparkles, Crown, ArrowRight, ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
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
    period: "",
    audience: "Pour commencer",
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
    badge: { label: "Sans frais", type: "neutral" },
  },
  {
    code: "homeowners_plus",
    name: "Plus",
    price: 49,
    period: "/ an",
    audience: "Pour les projets et décisions du quotidien",
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
    badge: { label: "Pour aller plus loin", type: "popular" },
    popular: true,
  },
  {
    code: "homeowners_signature",
    name: "Gold",
    price: 149,
    period: "/ an",
    audience: "Pour plusieurs propriétés",
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
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const displayedFeatures = showAllFeatures ? plan.features : plan.features.slice(0, 3);

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
          relative h-full flex flex-col rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-300
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
          <div className="mb-2">
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
        <p className="text-xs text-muted-foreground mb-2">{plan.audience}</p>

        {/* Price */}
        <div className="mb-1">
          <span className="text-4xl font-extrabold text-foreground">{plan.price} $</span>
          <span className="text-muted-foreground text-sm ml-1.5">{plan.period}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{plan.description}</p>

        {/* Features */}
        <ul className="space-y-2 mb-2 flex-1">
          {displayedFeatures.map((f) => (
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
        {plan.features.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllFeatures((value) => !value)}
            aria-expanded={showAllFeatures}
            className="inline-flex items-center gap-1.5 self-start mb-3 text-xs font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {showAllFeatures ? "Voir moins" : "Toutes les inclusions"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllFeatures ? "rotate-180" : ""}`} />
          </button>
        )}

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
    <section className="px-5 pt-3 pb-12 md:pt-6 md:pb-16" id="homeowner-plans">

      {/* Checkout Drawer */}
      <HomeownerCheckoutDrawer
        open={!!checkoutPlan}
        onOpenChange={(open) => !open && setCheckoutPlan(null)}
        planCode={checkoutPlan?.code || "plus"}
        planName={checkoutPlan?.name || "Plus"}
        price={checkoutPlan?.price || 49}
      />

      {/* ─── PLAN CARDS ─── */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-3 md:gap-4 mb-5 md:items-stretch">
        {plansWithCheckout.map((plan, i) => (
          <CardPlan
            key={plan.code}
            plan={plan}
            index={i}
            isCurrent={normalizeHomeownerPlanCode(plan.code.replace("homeowners_", "")) === currentPlanCode && !(plan.price === 0 && currentPlanCode !== "home_decouverte")}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto">
        <p className="text-xs text-muted-foreground mb-5">
          * Illimité selon un usage normal de propriétaire, avec protection contre les abus.
        </p>

        <button
          type="button"
          onClick={() => setShowComparison((value) => !value)}
          aria-expanded={showComparison}
          aria-controls="homeowner-comparison"
          className="flex items-center justify-between gap-3 w-full rounded-xl border border-border/40 bg-card/40 px-4 py-3.5 text-left text-sm font-semibold text-foreground hover:border-primary/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Comparer toutes les fonctionnalités
          <ChevronDown className={`h-4 w-4 shrink-0 text-primary transition-transform ${showComparison ? "rotate-180" : ""}`} />
        </button>
        {showComparison && (
          <div id="homeowner-comparison" className="mt-3 rounded-xl border border-border/30 bg-card/30 p-3 sm:p-5">
            <ComparisonMatrix />
          </div>
        )}

        <div className="max-w-2xl mx-auto mt-10">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 text-center">
            Questions fréquentes
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-border/30 bg-card/30 px-4 data-[state=open]:bg-card/50 transition-colors"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-3">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
