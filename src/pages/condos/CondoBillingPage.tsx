/**
 * UNPRO Condos — Billing & Subscription Page
 */
import { Link } from "react-router-dom";
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, ArrowRight, CheckCircle2, Zap, Settings } from "lucide-react";
import { CONDO_PRICING_TIERS } from "@/config/condoPricing";
import { useCondoSubscription } from "@/hooks/useCondoSubscription";
import { useSyndicates } from "@/hooks/useSyndicate";
import { toast } from "sonner";
import { useState } from "react";

const CondoBillingPage = () => {
  const { isPremium, planTier, subscriptionEnd, startCheckout, refetch } = useCondoSubscription();
  const { data: syndicates } = useSyndicates();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const syndicateId = syndicates?.[0]?.id;

  const handleCheckout = async (priceId: string) => {
    try {
      setLoadingTier(priceId);
      await startCheckout(priceId, syndicateId);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la création du paiement");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <CondoLayout>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">Facturation</h1>
        <p className="text-sm text-muted-foreground">Gérez votre abonnement UNPRO Condos</p>
      </div>

      {/* Current plan */}
      <Card className="border-border/40 bg-card/80 mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plan actuel</p>
              <h3 className="font-display font-bold text-lg">
                {isPremium ? "UNPRO Condos Premium" : "Passeport Immeuble Gratuit"}
              </h3>
              {isPremium && subscriptionEnd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renouvellement : {new Date(subscriptionEnd).toLocaleDateString("fr-CA")}
                </p>
              )}
            </div>
            <Badge variant="outline" className={isPremium ? "bg-primary/10 text-primary border-primary/20" : "bg-muted"}>
              {isPremium ? "Premium" : "Gratuit"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {!isPremium && (
        <>
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-warning" /> Passer au Premium
          </h2>

          <div className="space-y-2 mb-6">
            {CONDO_PRICING_TIERS.map((t) => (
              <Card key={t.priceId} className="border-border/40 bg-card/80 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-medium text-sm">{t.units}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-primary">
                      {t.priceTaxIncluded} $
                      <span className="text-xs font-normal text-muted-foreground"> / an</span>
                    </span>
                    <Button
                      size="sm"
                      className="rounded-lg"
                      disabled={loadingTier === t.priceId}
                      onClick={() => handleCheckout(t.priceId)}
                    >
                      {loadingTier === t.priceId ? "..." : "Choisir"}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tous les prix incluent TPS + TVQ (14,975 %). Facturation annuelle.
          </p>
        </>
      )}

      {isPremium && (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-5 flex items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-0.5">Abonnement Premium actif</h3>
              <p className="text-xs text-muted-foreground">
                Vous avez accès à toutes les fonctionnalités avancées d'UNPRO Condos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </CondoLayout>
  );
};

export default CondoBillingPage;
