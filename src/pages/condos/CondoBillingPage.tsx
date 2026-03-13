/**
 * UNPRO Condos — Billing & Subscription Page
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, CreditCard, CheckCircle2, Zap, Crown, ArrowRight } from "lucide-react";

const tiers = [
  { units: "2–4 unités", price: "150 $", priceId: "price_condo_2_4" },
  { units: "5–10 unités", price: "300 $", priceId: "price_condo_5_10" },
  { units: "11–20 unités", price: "500 $", priceId: "price_condo_11_20" },
  { units: "21–50 unités", price: "750 $", priceId: "price_condo_21_50" },
  { units: "51–100 unités", price: "1 000 $", priceId: "price_condo_51_100" },
  { units: "101+ unités", price: "1 500 $", priceId: "price_condo_101" },
];

const CondoBillingPage = () => {
  const currentPlan = "free"; // Will come from condo_subscriptions

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
              <h3 className="font-display font-bold text-lg">{currentPlan === "free" ? "Passeport Immeuble Gratuit" : "UNPRO Condos Premium"}</h3>
            </div>
            <Badge variant="outline" className={currentPlan === "free" ? "bg-muted" : "bg-primary/10 text-primary border-primary/20"}>
              {currentPlan === "free" ? "Gratuit" : "Premium"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {currentPlan === "free" && (
        <>
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-warning" /> Passer au Premium
          </h2>

          <div className="space-y-2 mb-6">
            {tiers.map((t, i) => (
              <Card key={i} className="border-border/40 bg-card/80 hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-medium text-sm">{t.units}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-primary">{t.price}<span className="text-xs font-normal text-muted-foreground"> / an</span></span>
                    <Button size="sm" className="rounded-lg">
                      Choisir <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">Tous les prix incluent TPS + TVQ (14,975 %). Facturation annuelle.</p>
        </>
      )}
    </CondoLayout>
  );
};

export default CondoBillingPage;
