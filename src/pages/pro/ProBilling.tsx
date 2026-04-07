import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useContractorSubscription,
  useCreateCheckoutSession,
  useCreateBillingPortal,
} from "@/hooks/useSubscription";
import {
  usePlanCatalog,
  formatPlanPrice,
  getStripePriceId,
  getYearlySavingsPercent,
  getMonthlyEquivalent,
  type BillingInterval,
  type CatalogPlan,
} from "@/hooks/usePlanCatalog";
import { toast } from "sonner";
import { Check, CreditCard, ExternalLink } from "lucide-react";

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
  const price = interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
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
            / {interval === "year" ? "an" : "mois"}
          </span>
        </p>
        {interval === "year" && savings > 0 && (
          <div className="space-y-0.5">
            <Badge variant="secondary" className="text-xs bg-secondary/20 text-secondary-foreground">
              Économisez {savings} %
            </Badge>
            <p className="text-xs text-muted-foreground">
              Équivalent à {getMonthlyEquivalent(plan)} / mois
            </p>
          </div>
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
  const { data: subscription, isLoading } = useContractorSubscription();
  const checkout = useCreateCheckoutSession();
  const portal = useCreateBillingPortal();
  const [interval, setInterval] = useState<BillingInterval>("month");

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Abonnement activé avec succès !");
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Paiement annulé.");
    }
  }, [searchParams]);

  const { data: allPlans } = usePlanCatalog();
  const currentPlan = subscription ? (allPlans ?? []).find(p => p.code === subscription.plan_id) : null;
  const isActive =
    subscription && ["active", "trialing"].includes(subscription.status);

  const handleSubscribe = async (plan: CatalogPlan) => {
    try {
      const priceId = getStripePriceId(plan, interval);
      const result = await checkout.mutateAsync({
        priceId,
        planId: plan.id,
        billingInterval: interval,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la création du paiement.");
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

      {/* Interval toggle */}
      <h2 className="text-lg font-semibold mb-4 text-center">
        {isActive ? "Changer de plan" : "Choisir un plan"}
      </h2>

      <BillingToggle interval={interval} onChange={setInterval} />

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(allPlans ?? []).map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            interval={interval}
            isCurrent={isActive === true && currentPlan?.code === plan.code}
            isActive={!!isActive}
            onSubscribe={() => handleSubscribe(plan)}
            onPortal={handlePortal}
            isLoading={checkout.isPending || portal.isPending}
          />
        ))}
      </div>
    </ContractorLayout>
  );
};

export default ProBilling;
