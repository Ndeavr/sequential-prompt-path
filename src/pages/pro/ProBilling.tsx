import { useEffect } from "react";
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
  CONTRACTOR_PLANS,
  getPlanById,
  formatPlanPrice,
} from "@/config/contractorPlans";
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

const ProBilling = () => {
  const [searchParams] = useSearchParams();
  const { data: subscription, isLoading } = useContractorSubscription();
  const checkout = useCreateCheckoutSession();
  const portal = useCreateBillingPortal();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Abonnement activé avec succès !");
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Paiement annulé.");
    }
  }, [searchParams]);

  const currentPlan = subscription ? getPlanById(subscription.plan_id) : null;
  const isActive = subscription && ["active", "trialing"].includes(subscription.status);

  const handleSubscribe = async (plan: (typeof CONTRACTOR_PLANS)[0]) => {
    try {
      const result = await checkout.mutateAsync({
        priceId: plan.stripePriceId,
        planId: plan.id,
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
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold">{currentPlan.name}</span>
              <Badge variant="default">
                {statusLabels[subscription!.status] ?? subscription!.status}
              </Badge>
              {subscription!.cancel_at_period_end && (
                <Badge variant="destructive">Annulation prévue</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatPlanPrice(currentPlan.monthlyPrice)} / mois
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
              {portal.isPending
                ? "Ouverture…"
                : "Gérer l'abonnement"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator className="my-6" />

      {/* Plan cards */}
      <h2 className="text-lg font-semibold mb-4">
        {isActive ? "Changer de plan" : "Choisir un plan"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONTRACTOR_PLANS.map((plan) => {
          const isCurrent = isActive && currentPlan?.id === plan.id;
          return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.highlighted
                  ? "border-primary ring-1 ring-primary"
                  : ""
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
                  {formatPlanPrice(plan.monthlyPrice)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / mois
                  </span>
                </p>
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
                    onClick={handlePortal}
                    disabled={portal.isPending}
                  >
                    Changer
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan)}
                    disabled={checkout.isPending}
                  >
                    {checkout.isPending ? "Chargement…" : "S'abonner"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ContractorLayout>
  );
};

export default ProBilling;
