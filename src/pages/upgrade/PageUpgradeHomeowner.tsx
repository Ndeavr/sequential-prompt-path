/**
 * UNPRO — Homeowner Upgrade Page
 * Real upgrade experience (no placeholder). Reads the authoritative plan matrix
 * from the DB and opens Stripe Checkout directly.
 *
 * Query params:
 *   ?feature=<feature_key>  → shows why the user hit the wall
 *   ?return=<path>          → where to come back after payment
 *   ?suggested=<plan_code>  → highlight a specific plan
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Crown, Loader2, Home, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import {
  useHomeownerPlan,
  useHomeownerPlanCatalog,
  useRefreshEntitlements,
  toCheckoutPlanCode,
  type HomeownerPlanCode,
} from "@/features/planSystem/useHomeownerPlan";

const FEATURE_LABELS: Record<string, string> = {
  properties_max: "Ajouter une adresse supplémentaire",
  quote_analysis_monthly: "Analyser plus de soumissions",
  quote_comparison: "Comparer vos soumissions",
  contractor_verification_detailed: "Vérification entrepreneur détaillée",
  maintenance_reminders: "Rappels d'entretien",
  document_archive_advanced: "Archivage avancé des documents",
  project_history: "Historique des projets et dépenses",
  alex_priority: "Accompagnement Alex avancé",
  work_prioritization: "Priorisation des travaux",
  proactive_suggestions: "Suggestions proactives",
  priority_support: "Support prioritaire",
};

const PLAN_ICON: Record<string, typeof Home> = {
  home_decouverte: Home,
  home_plus: Sparkles,
  home_signature: Crown,
};

const fmt = (cents: number) =>
  cents === 0 ? "Gratuit" : `${Math.round(cents / 100).toLocaleString("fr-CA")} $`;

export default function PageUpgradeHomeowner() {
  const [params] = useSearchParams();
  const { session } = useAuth();
  const featureKey = params.get("feature");
  const returnPath = params.get("return") || "/compte";
  const suggested = params.get("suggested");

  const { planCode, isPaid, currentPeriodEnd, cancelAtPeriodEnd } = useHomeownerPlan();
  const { data: catalog, isLoading } = useHomeownerPlanCatalog();
  const refreshEntitlements = useRefreshEntitlements();

  const [busy, setBusy] = useState<string | null>(null);

  // Entitlements refresh as soon as the user comes back from Stripe.
  useEffect(() => {
    if (params.get("success")) {
      refreshEntitlements();
      toast.success("Paiement confirmé. Votre plan est activé.");
    }
    if (params.get("canceled")) {
      toast.info("Paiement annulé. Aucun montant n'a été prélevé.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plans = catalog?.plans ?? [];
  const features = catalog?.features ?? [];

  const featuresByPlan = useMemo(() => {
    const map: Record<string, { key: string; enabled: boolean; limit: number | null }[]> = {};
    for (const f of features) {
      (map[f.planCode] ||= []).push({ key: f.featureKey, enabled: f.enabled, limit: f.limitValue });
    }
    return map;
  }, [features]);

  const currentRank = plans.find((p) => p.code === planCode)?.tierRank ?? 0;

  const startCheckout = async (code: HomeownerPlanCode) => {
    const checkoutCode = toCheckoutPlanCode(code);
    if (!checkoutCode) return;

    if (!session) {
      const next = `/upgrade?suggested=${code}&return=${encodeURIComponent(returnPath)}`;
      window.location.href = `/auth?redirect=${encodeURIComponent(next)}`;
      return;
    }

    setBusy(code);
    try {
      const { data, error } = await supabase.functions.invoke("create-homeowner-checkout", {
        body: { planCode: checkoutCode, returnPath },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Session de paiement indisponible.");
      redirectToCheckout(data.url);
    } catch (e: any) {
      console.error("[upgrade] checkout error", e);
      toast.error(e?.message || "Le paiement n'a pas pu être lancé. Réessayez.");
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy("portal");
    try {
      const { data, error } = await supabase.functions.invoke("create-homeowner-checkout", {
        body: { mode: "portal", returnPath },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Portail de facturation indisponible.");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Le portail de facturation est indisponible.");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Améliorer mon plan UNPRO — Propriétaires</title>
        <meta
          name="description"
          content="Choisissez votre plan propriétaire UNPRO : Découverte, Plus ou Signature. Activation immédiate après paiement."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-5 py-8 md:py-14">
        <Link
          to={returnPath}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Améliorer mon plan
          </h1>
          {featureKey && FEATURE_LABELS[featureKey] ? (
            <p className="mt-3 text-base text-muted-foreground max-w-2xl">
              <span className="font-semibold text-foreground">
                {FEATURE_LABELS[featureKey]}
              </span>{" "}
              nécessite un plan supérieur. Activez-le en moins d'une minute.
            </p>
          ) : (
            <p className="mt-3 text-base text-muted-foreground max-w-2xl">
              Débloquez les analyses illimitées, la comparaison de soumissions et le suivi complet
              de votre maison.
            </p>
          )}
        </motion.div>

        {/* Current plan */}
        <div className="mt-6 rounded-2xl border border-border/40 bg-card/60 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Plan actuel : </span>
            <span className="font-semibold text-foreground">
              {plans.find((p) => p.code === planCode)?.name ?? "Découverte"}
            </span>
            {currentPeriodEnd && (
              <span className="text-muted-foreground">
                {" "}
                · {cancelAtPeriodEnd ? "se termine le" : "renouvellement le"}{" "}
                {new Date(currentPeriodEnd).toLocaleDateString("fr-CA")}
              </span>
            )}
          </div>
          {isPaid && (
            <Button variant="outline" size="sm" onClick={openPortal} disabled={busy === "portal"}>
              {busy === "portal" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Gérer mon abonnement
            </Button>
          )}
        </div>

        {/* Plans */}
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-3 items-stretch">
            {plans.map((plan) => {
              const Icon = PLAN_ICON[plan.code] ?? Home;
              const isCurrent = plan.code === planCode;
              const isDowngrade = plan.tierRank < currentRank;
              const highlight = suggested ? plan.code === suggested : plan.code === "home_plus";
              const planFeatures = (featuresByPlan[plan.code] ?? []).filter((f) => f.enabled);

              return (
                <div
                  key={plan.code}
                  className={`relative flex flex-col rounded-[28px] border p-6 bg-card/60 backdrop-blur-xl transition-all ${
                    highlight && !isCurrent
                      ? "border-primary/50 shadow-lg"
                      : "border-border/40"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-6 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                      Votre plan
                    </span>
                  )}
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">
                      {fmt(plan.yearlyPrice)}
                    </span>
                    {plan.yearlyPrice > 0 && (
                      <span className="text-sm text-muted-foreground"> / an</span>
                    )}
                  </div>
                  {plan.tagline && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {plan.tagline}
                    </p>
                  )}

                  <ul className="mt-5 space-y-2 flex-1">
                    {planFeatures.map((f) => (
                      <li key={f.key} className="flex items-start gap-2 text-sm text-foreground/90">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>
                          {FEATURE_LABELS[f.key] ?? f.key}
                          {f.limit !== null && f.limit > 0 && f.limit !== 1 && (
                            <span className="text-muted-foreground"> · {f.limit}</span>
                          )}
                          {f.limit === -1 && (
                            <span className="text-muted-foreground"> · illimité</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    {isCurrent ? (
                      <Button variant="outline" className="w-full rounded-xl" disabled>
                        Plan actuel
                      </Button>
                    ) : plan.yearlyPrice === 0 ? (
                      <Button variant="ghost" className="w-full rounded-xl" asChild>
                        <Link to={returnPath}>Continuer gratuitement</Link>
                      </Button>
                    ) : (
                      <Button
                        className="w-full rounded-xl font-bold"
                        variant={isDowngrade ? "outline" : "default"}
                        onClick={() => startCheckout(plan.code)}
                        disabled={busy === plan.code}
                      >
                        {busy === plan.code ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        {isDowngrade ? `Passer à ${plan.name}` : `Activer ${plan.name}`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          Paiement sécurisé via Stripe · Annulation en tout temps
        </div>
      </div>
    </div>
  );
}
