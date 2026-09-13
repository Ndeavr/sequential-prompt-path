import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useContractorSubscription,
  useCreateBillingPortal,
} from "@/hooks/useSubscription";
import {
  usePlanCatalog,
  formatPlanPrice,
  getYearlySavingsPercent,
  getMonthlyEquivalent,
  type BillingInterval,
  type CatalogPlan,
} from "@/hooks/usePlanCatalog";
import {
  useContractorPlanEligibility,
  startContractorPlanCheckout,
  PERSONALIZED_PLAN_HEADING,
  PERSONALIZED_PLAN_CTA,
  PERSONALIZED_PLAN_ROUTE,
} from "@/lib/billing/contractorPlanEligibility";
import { toast } from "sonner";
import { Check, CreditCard, ExternalLink, Sparkles } from "lucide-react";


const statusLabels: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  inactive: "Inactif",
  incomplete: "Incomplet",
};

const intervalLabels: Record<BillingInterval, string> = {
  month: "Mensuel",
  year: "Annuel",
};

/* ── Billing Toggle ──────────────────────────────────────── */

const BillingToggle = ({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (v: BillingInterval) => void;
}) => (
  <div className="flex items-center justify-center gap-1 rounded-full bg-muted p-1 w-fit mx-auto mb-8">
    <button
      onClick={() => onChange("month")}
      className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
        interval === "month"
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      Mensuel
    </button>
    <button
      onClick={() => onChange("year")}
      className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
        interval === "year"
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      Annuel
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 leading-4 bg-accent/20 text-accent-foreground">
        −15 %
      </Badge>
    </button>
  </div>
);

/* ── Plan Card ───────────────────────────────────────────── */

const PlanCard = ({
  plan,
  interval,
  isCurrent,
  isActive,
  onSubscribe,
  onPortal,
  isLoading,
}: {
  plan: CatalogPlan;
  interval: BillingInterval;
  isCurrent: boolean;
  isActive: boolean;
  onSubscribe: () => void;
  onPortal: () => void;
  isLoading: boolean;
}) => {
  // Un plan sans prix annuel Stripe reste facturé au mois : afficher l'annuel
  // provoquerait « Price not configured » au checkout.
  const effectiveInterval: BillingInterval =
    interval === "year" && plan.supportsYearly ? "year" : "month";
  const price = effectiveInterval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
  const savings = getYearlySavingsPercent(plan);


  return (
    <Card
      className={`relative ${
        plan.highlighted ? "border-primary ring-1 ring-primary" : ""
      } ${isCurrent ? "bg-accent/30" : ""}`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground text-xs">
            Populaire
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{plan.name}</CardTitle>
        <p className="text-2xl font-bold">
          {formatPlanPrice(price)}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {effectiveInterval === "year" ? "an" : "mois"}
          </span>
        </p>
        {effectiveInterval === "year" && savings > 0 && (
          <div className="space-y-0.5">
            <Badge variant="secondary" className="text-xs bg-secondary/20 text-secondary-foreground">
              Économisez {savings} %
            </Badge>
            <p className="text-xs text-muted-foreground">
              Équivalent à {getMonthlyEquivalent(plan)} / mois
            </p>
          </div>
        )}
        {interval === "year" && !plan.supportsYearly && (
          <p className="text-xs text-muted-foreground">
            Facturation mensuelle seulement pour ce plan.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <ul className="space-y-2 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {isCurrent ? (
          <Button variant="outline" disabled className="w-full">
            Plan actuel
          </Button>
        ) : isActive ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={onPortal}
            disabled={isLoading}
          >
            Changer
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={onSubscribe}
            disabled={isLoading}
          >
            {isLoading ? "Chargement…" : "S'abonner"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Page ─────────────────────────────────────────────────── */

const ProBilling = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useContractorSubscription();
  const portal = useCreateBillingPortal();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [checkoutPending, setCheckoutPending] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Abonnement activé avec succès !");
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Paiement annulé.");
    }
  }, [searchParams]);

  const { data: allPlans } = usePlanCatalog();
  const { eligibility, isLoading: eligibilityLoading } =
    useContractorPlanEligibility(interval);
  const currentPlan = subscription ? (allPlans ?? []).find(p => p.code === subscription.plan_id) : null;
  const isActive =
    subscription && ["active", "trialing"].includes(subscription.status);

  /** L'annuel n'est proposé que si au moins un plan a un vrai prix annuel Stripe. */
  const yearlyAvailable = (allPlans ?? []).some((p) => p.supportsYearly);

  // Intervalle demandé par un lien entrant (UpgradeWindow, courriel).
  useEffect(() => {
    if (searchParams.get("interval") === "year") setInterval("year");
  }, [searchParams]);

  useEffect(() => {
    if (!yearlyAvailable) setInterval("month");
  }, [yearlyAvailable]);

  /** Seuls les plans réellement activables sont affichés. */
  const selectablePlans: CatalogPlan[] =
    eligibility?.mode === "standard"
      ? (allPlans ?? []).filter((p) => p.code === eligibility.allowedPlanCode)
      : [];

  const goPersonalize = () => navigate(PERSONALIZED_PLAN_ROUTE);

  const handleSubscribe = async (plan: CatalogPlan) => {
    if (eligibility?.mode !== "standard" || plan.code !== eligibility.allowedPlanCode) {
      goPersonalize();
      return;
    }
    setCheckoutPending(true);
    try {
      // Le serveur reste l'autorité sur le montant ; on n'envoie qu'un
      // intervalle réellement facturable pour ce plan.
      const effectiveInterval: BillingInterval =
        interval === "year" && plan.supportsYearly ? "year" : "month";
      const { url } = await startContractorPlanCheckout({
        planCode: plan.code,
        billingInterval: effectiveInterval,
        quoteId: eligibility.quoteId,
        successUrl: `${window.location.origin}/pro/facturation?success=true`,
        cancelUrl: `${window.location.origin}/pro/facturation?canceled=true`,
      });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || "Le paiement n'a pas pu démarrer.");
    } finally {
      setCheckoutPending(false);
    }
  };



  const handlePortal = async () => {
    try {
      const result = await portal.mutateAsync();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'ouverture du portail.");
    }
  };

  if (isLoading) {
    return (
      <ContractorLayout>
        <LoadingState />
      </ContractorLayout>
    );
  }

  return (
    <ContractorLayout>
      <PageHeader
        title="Facturation"
        description="Gérez votre abonnement et votre plan"
      />

      {/* Current plan summary */}
      {isActive && currentPlan && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plan actuel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-lg font-bold">{currentPlan.name}</span>
              <Badge variant="default">
                {statusLabels[subscription!.status] ?? subscription!.status}
              </Badge>
              <Badge variant="outline">
                {intervalLabels[(subscription as any)?.billing_interval as BillingInterval] ?? "Mensuel"}
              </Badge>
              {subscription!.cancel_at_period_end && (
                <Badge variant="destructive">Annulation prévue</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatPlanPrice(
                currentPlan ? (((subscription as any)?.billing_interval === "year") ? currentPlan.yearlyPrice : currentPlan.monthlyPrice) : 0
              )}{" "}
              / {(subscription as any)?.billing_interval === "year" ? "an" : "mois"}
            </p>
            {subscription!.current_period_end && (
              <p className="text-sm text-muted-foreground">
                Prochain renouvellement :{" "}
                {new Date(subscription!.current_period_end).toLocaleDateString(
                  "fr-CA"
                )}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={portal.isPending}
              className="gap-2"
            >
              <ExternalLink className="h-3 w-3" />
              {portal.isPending ? "Ouverture…" : "Gérer l'abonnement"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator className="my-6" />

      {eligibilityLoading ? (
        <LoadingState />
      ) : eligibility?.mode === "standard" ? (
        <>
          <h2 className="text-lg font-semibold mb-4 text-center">
            {isActive ? "Changer de plan" : "Choisir un plan"}
          </h2>

          {yearlyAvailable && <BillingToggle interval={interval} onChange={setInterval} />}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectablePlans.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                interval={interval}
                isCurrent={isActive === true && currentPlan?.code === plan.code}
                isActive={!!isActive}
                onSubscribe={() => handleSubscribe(plan)}
                onPortal={handlePortal}
                isLoading={checkoutPending || portal.isPending}
              />
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline" onClick={goPersonalize} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {PERSONALIZED_PLAN_CTA}
            </Button>
          </div>
        </>
      ) : (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-1" />
              {PERSONALIZED_PLAN_HEADING}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Votre plan est établi à partir de votre métier, de votre territoire,
              de votre capacité et de vos objectifs de rendez-vous. Quelques
              questions suffisent pour obtenir votre recommandation.
            </p>
            <Button onClick={goPersonalize} className="w-full sm:w-auto gap-2">
              <Sparkles className="h-4 w-4" />
              {PERSONALIZED_PLAN_CTA}
            </Button>
          </CardContent>
        </Card>
      )}

    </ContractorLayout>
  );
};

export default ProBilling;
