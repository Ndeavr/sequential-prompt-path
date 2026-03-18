/**
 * UNPRO — Contractor Plans with pre-selection support
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ArrowRight, HardHat, Users, TrendingUp,
  Star, Crown, Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

interface PlanDef {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  classes: { label: string; price: string }[];
  cta: string;
  ctaLink: string;
  icon: React.ElementType;
  highlight?: boolean;
  badge?: string;
  requiresPayment: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: "recrue",
    name: "Recrue",
    price: "0 $",
    period: "/mois",
    features: ["Profil entreprise", "Visibilité standard", "Score AIPP basique"],
    classes: [
      { label: "S", price: "15 $" },
      { label: "M", price: "50 $" },
    ],
    cta: "Créer mon profil",
    ctaLink: "/signup?type=contractor",
    icon: Users,
    requiresPayment: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "49 $",
    period: "/mois",
    features: ["Profil complet", "Visibilité améliorée", "Notifications projets"],
    classes: [
      { label: "S", price: "15 $" },
      { label: "M", price: "50 $" },
      { label: "L", price: "120 $" },
    ],
    cta: "Passer Pro",
    ctaLink: "/signup?type=contractor&plan=pro",
    icon: TrendingUp,
    requiresPayment: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "99 $",
    period: "/mois",
    highlight: true,
    badge: "Populaire",
    features: ["Visibilité prioritaire", "Badge confiance", "Agenda intelligent", "Filtres projets", "Auto-accepter"],
    classes: [
      { label: "S", price: "15 $" },
      { label: "M", price: "50 $" },
      { label: "L", price: "120 $" },
      { label: "XL", price: "250 $" },
    ],
    cta: "Choisir Premium",
    ctaLink: "/signup?type=contractor&plan=premium",
    icon: Star,
    requiresPayment: true,
  },
  {
    id: "elite",
    name: "Élite",
    price: "199 $",
    period: "/mois",
    features: ["Placement prioritaire", "Analytics avancés", "Statistiques performance", "Auto-accepter avancé", "Priorité score"],
    classes: [
      { label: "S", price: "15 $" },
      { label: "M", price: "50 $" },
      { label: "L", price: "120 $" },
      { label: "XL", price: "250 $" },
      { label: "XXL", price: "500 $" },
    ],
    cta: "Choisir Élite",
    ctaLink: "/signup?type=contractor&plan=elite",
    icon: Crown,
    requiresPayment: true,
  },
];

function PlanCard({ plan, index, isRecommended, onCheckout }: {
  plan: PlanDef;
  index: number;
  isRecommended: boolean;
  onCheckout: (planId: string) => void;
}) {
  const isHighlighted = isRecommended || plan.highlight;

  return (
    <motion.div variants={fadeUp} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <div className={`rounded-2xl p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 relative ${
        isHighlighted
          ? "bg-card border-2 border-primary/30 shadow-glow"
          : "glass-card-elevated"
      }`}>
        {isRecommended && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-accent text-accent-foreground shadow-glow text-xs px-3 py-1">
              ⭐ Recommandé pour vous
            </Badge>
          </div>
        )}
        {!isRecommended && plan.highlight && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground shadow-glow text-xs px-3 py-1">
              <Star className="h-3 w-3 mr-1" /> {plan.badge}
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2 mb-1">
          <plan.icon className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
        </div>

        <div className="mb-4">
          <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
          <span className="text-muted-foreground text-sm">{plan.period}</span>
        </div>

        <ul className="space-y-2.5 mb-5 flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <span className="text-sm text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>

        {/* Project classes */}
        <div className="mb-5 p-3 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Accès projets & prix</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.classes.map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1 text-xs bg-background border border-border rounded-lg px-2 py-1">
                <span className="font-bold text-primary">{c.label}</span>
                <span className="text-muted-foreground">{c.price}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Contextual links */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
          <Link to="/score-aipp" className="text-[10px] text-muted-foreground hover:text-primary underline decoration-dotted underline-offset-2 transition-colors">Score AIPP</Link>
          <Link to="/comment-ca-marche" className="text-[10px] text-muted-foreground hover:text-primary underline decoration-dotted underline-offset-2 transition-colors">Comment ça marche</Link>
        </div>

        {plan.requiresPayment ? (
          <Button
            size="lg"
            variant={isHighlighted ? "default" : "outline"}
            className={`w-full rounded-xl ${isHighlighted ? "shadow-glow" : ""}`}
            onClick={() => onCheckout(plan.id)}
          >
            {plan.cta} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full rounded-xl"
          >
            <Link to={plan.ctaLink}>{plan.cta}</Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function ContractorPlans({ preSelectedPlan }: { preSelectedPlan?: string | null }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Redirect to signup with plan intent
        window.location.href = `/signup?type=contractor&plan=${planId}`;
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          planId,
          billingInterval: "month",
          successUrl: `${window.location.origin}/pro/onboarding?plan=${planId}&checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?plan=${planId}&checkout=cancelled`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Erreur lors du paiement. Réessayez.");
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="px-5 py-16 md:py-20 relative">
      <div className="absolute inset-0 section-gradient" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-secondary/8 text-secondary text-sm font-semibold mb-4">
            <HardHat className="h-3.5 w-3.5" /> Pour les entrepreneurs
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Choisissez votre plan</h2>
          <p className="text-muted-foreground mt-2">Recevez des rendez-vous garantis exclusifs. Pas des leads partagés.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={i}
              isRecommended={preSelectedPlan === plan.id}
              onCheckout={handleCheckout}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
