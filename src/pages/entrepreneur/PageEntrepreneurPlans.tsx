/**
 * /entrepreneurs/plans — Plan comparison page for contractors
 */
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, ArrowRight, Star, Sparkles, TrendingDown } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

interface JoinDemo {
  business_name: string;
  city: string;
  score: number;
  recommended_plan: string;
  revenue_gap?: { lost_revenue_min: number };
}

interface PlanDef {
  name: string;
  price: string;
  period: string;
  badge?: string;
  highlight?: boolean;
  features: { label: string; included: boolean }[];
  cta: string;
}

const PLANS: PlanDef[] = [
  {
    name: "Recrue",
    price: "0$",
    period: "/mois",
    features: [
      { label: "Profil public de base", included: true },
      { label: "Score AIPP visible", included: true },
      { label: "1 territoire", included: true },
      { label: "2 catégories", included: true },
      { label: "Rendez-vous qualifiés", included: false },
      { label: "Exclusivité territoriale", included: false },
      { label: "Priorité de matching", included: false },
    ],
    cta: "Commencer gratuitement",
  },
  {
    name: "Pro",
    price: "49$",
    period: "/mois",
    features: [
      { label: "Profil public optimisé", included: true },
      { label: "Score AIPP visible", included: true },
      { label: "3 territoires", included: true },
      { label: "5 catégories", included: true },
      { label: "Rendez-vous qualifiés", included: true },
      { label: "Exclusivité territoriale", included: false },
      { label: "Priorité de matching", included: false },
    ],
    cta: "Choisir Pro",
  },
  {
    name: "Premium",
    price: "99$",
    period: "/mois",
    badge: "Populaire",
    highlight: true,
    features: [
      { label: "Profil public premium", included: true },
      { label: "Score AIPP + coaching", included: true },
      { label: "5 territoires", included: true },
      { label: "10 catégories", included: true },
      { label: "Rendez-vous qualifiés prioritaires", included: true },
      { label: "Exclusivité territoriale", included: false },
      { label: "Priorité de matching élevée", included: true },
    ],
    cta: "Choisir Premium",
  },
  {
    name: "Élite",
    price: "199$",
    period: "/mois",
    features: [
      { label: "Profil public élite", included: true },
      { label: "Score AIPP + analytics avancés", included: true },
      { label: "7 territoires", included: true },
      { label: "15 catégories", included: true },
      { label: "Tous types de rendez-vous", included: true },
      { label: "Exclusivité partielle", included: true },
      { label: "Priorité maximale", included: true },
    ],
    cta: "Choisir Élite",
  },
  {
    name: "Signature",
    price: "399$",
    period: "/mois",
    badge: "Exclusif",
    features: [
      { label: "Profil public signature", included: true },
      { label: "Score AIPP + stratégie dédiée", included: true },
      { label: "10+ territoires", included: true },
      { label: "20+ catégories", included: true },
      { label: "Tous rendez-vous + urgences", included: true },
      { label: "Exclusivité territoriale totale", included: true },
      { label: "Matching prioritaire absolu", included: true },
    ],
    cta: "Choisir Signature",
  },
];

export default function PageEntrepreneurPlans() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Plans et tarifs — UNPRO pour entrepreneurs</title>
        <meta name="description" content="Choisissez votre plan UNPRO : Recrue (gratuit), Pro, Premium, Élite ou Signature. Rendez-vous qualifiés et visibilité protégée." />
      </Helmet>

      <div className="min-h-screen bg-background py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="text-center mb-16">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Plans et tarifs
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Investissez dans votre visibilité. Recevez des rendez-vous qualifiés, pas des leads froids.
            </p>
          </motion.div>

          {/* Plans grid - horizontal scroll on mobile */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-visible">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className={`
                  snap-start shrink-0 w-72 lg:w-auto rounded-2xl border p-6 flex flex-col
                  ${plan.highlight
                    ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                    : "border-border bg-card"
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
                  {plan.badge && (
                    <Badge variant={plan.highlight ? "default" : "secondary"} className="text-xs">
                      {plan.badge === "Populaire" && <Star className="h-3 w-3 mr-1" />}
                      {plan.badge === "Exclusif" && <Sparkles className="h-3 w-3 mr-1" />}
                      {plan.badge}
                    </Badge>
                  )}
                </div>

                <div className="mb-6">
                  <span className="font-display text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlight ? "default" : "outline"}
                  className="w-full gap-2 rounded-xl"
                  onClick={() => navigate(`/entrepreneur?plan=${plan.name.toLowerCase()}`)}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto text-center">
            <p className="text-muted-foreground">
              Tous les plans incluent le profil public, le score AIPP et l'accès à Alex.
              <br />
              <span className="text-sm">Taxes en sus. Annulation possible en tout temps.</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
