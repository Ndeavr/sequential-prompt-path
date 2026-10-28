/**
 * UNPRO — Tarifs propriétaires courts : l'essentiel d'abord.
 * Préserve les codes de forfaits et le checkout Stripe existants.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronDown, Crown, House, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import HomeownerCheckoutDrawer from "@/components/pricing/HomeownerCheckoutDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useHomeownerPlan } from "@/features/planSystem/useHomeownerPlan";

const PLANS = [
  {
    code: "home_decouverte",
    name: "Gratuit",
    price: 0,
    subtitle: "Pour découvrir UNPRO",
    summary: "1 analyse de soumissions par mois et votre Passeport Maison.",
    icon: House,
    features: [
      "1 analyse de soumissions par mois",
      "1 Passeport Maison",
      "1 propriété",
      "Jusqu'à 3 soumissions par analyse",
      "1 design IA par mois",
      "Historique conservé pour votre propriété",
    ],
    microcopy: "Aucune carte requise.",
  },
  {
    code: "home_plus",
    name: "Plus",
    price: 49,
    subtitle: "Pour aller plus loin",
    summary: "Analyses illimitées et Passeport Maison complet.",
    icon: Sparkles,
    features: [
      "Analyses de soumissions illimitées*",
      "Passeport Maison complet",
      "1 propriété",
      "Jusqu'à 3 soumissions par analyse",
      "10 designs IA par mois",
      "Historique complet de la propriété",
    ],
    microcopy: "Pour une propriété.",
  },
  {
    code: "home_signature",
    name: "Gold",
    price: 149,
    subtitle: "Pour plusieurs propriétés",
    summary: "Jusqu'à 3 propriétés réunies au même endroit.",
    icon: Crown,
    features: [
      "Jusqu'à 3 propriétés",
      "Un Passeport Maison par propriété",
      "Analyses de soumissions illimitées*",
      "Designs IA illimités*",
      "Historique distinct par propriété",
      "Changement de propriété facile sur mobile",
    ],
    microcopy: "Pour plusieurs adresses.",
  },
] as const;

type Plan = (typeof PLANS)[number];
type CheckoutPlan = { code: "plus" | "signature"; name: string; price: number };

function PlanCard({
  plan,
  isCurrent,
  onCheckout,
}: {
  plan: Plan;
  isCurrent: boolean;
  onCheckout: (plan: CheckoutPlan) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = plan.icon;
  const featured = plan.code === "home_plus";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.28 }}
      data-testid={`pricing-card-${plan.code}`}
      className={`flex h-full flex-col rounded-2xl border p-4 md:p-5 ${featured ? "border-primary/40 bg-card shadow-glow" : "border-border/40 bg-card/70"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{plan.name}</h2>
            <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-2xl font-extrabold tabular-nums text-foreground">{plan.price} $</span>
          {plan.price > 0 && <span className="block text-[11px] text-muted-foreground">par année</span>}
        </div>
      </div>

      <p className="mt-3 text-sm leading-snug text-foreground/80">{plan.summary}</p>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {plan.features.slice(0, 2).map((feature) => (
          <span key={feature} className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            {feature}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4">
        {isCurrent && plan.price > 0 ? (
          <Button className="min-h-11 w-full rounded-xl" variant="outline" disabled>
            Votre forfait actuel
          </Button>
        ) : plan.price === 0 ? (
          <Button asChild className="min-h-11 w-full rounded-xl" variant={featured ? "default" : "outline"}>
            <Link to={isCurrent ? "/proprietaire/bienvenue" : "/signup?redirect=/proprietaire/bienvenue?plan=discovery"}>
              {isCurrent ? "Accéder à mon espace" : "Commencer gratuitement"}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button
            className="min-h-11 w-full rounded-xl"
            onClick={() => onCheckout({ code: plan.code === "home_plus" ? "plus" : "signature", name: plan.name, price: plan.price })}
          >
            Choisir {plan.name}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {expanded ? "Masquer les inclusions" : "Voir toutes les inclusions"}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {expanded && (
          <ul className="mt-2 space-y-2 border-t border-border/40 pt-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-center text-[11px] text-muted-foreground">{plan.microcopy}</p>
      </div>
    </motion.article>
  );
}

export default function HomeownerPlans() {
  const { planCode: currentPlanCode } = useHomeownerPlan();
  const { session } = useAuth();
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);

  return (
    <section className="px-4 pb-10 pt-2 sm:px-5 md:pb-14" id="homeowner-plans" aria-label="Forfaits pour propriétaires">
      <HomeownerCheckoutDrawer
        open={checkoutPlan !== null}
        onOpenChange={(open) => { if (!open) setCheckoutPlan(null); }}
        planCode={checkoutPlan?.code ?? "plus"}
        planName={checkoutPlan?.name ?? "Plus"}
        price={checkoutPlan?.price ?? 49}
      />

      <div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-3 md:gap-4">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            isCurrent={Boolean(session && currentPlanCode === plan.code)}
            onCheckout={setCheckoutPlan}
          />
        ))}
      </div>
      <p className="mx-auto mt-3 max-w-5xl text-center text-[11px] text-muted-foreground">
        * Utilisation raisonnable. Toutes les inclusions sont consultables dans chaque forfait.
      </p>
    </section>
  );
}
