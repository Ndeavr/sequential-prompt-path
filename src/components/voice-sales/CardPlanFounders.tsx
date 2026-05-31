import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";

interface Props {
  plan: any;
  foundersPrice?: number;
  onSelect: (planId: string) => void;
}

export default function CardPlanFounders({ plan, foundersPrice, onSelect }: Props) {
  // Fondateurs = couche PRESTIGE (jamais un rabais).
  // On n'affiche un prix Fondateur que s'il est strictement supérieur au prix régulier.
  const regular = plan?.monthly_price ?? 0;
  const prestigeValid = typeof foundersPrice === "number" && foundersPrice > regular;
  const prestigePrice = prestigeValid ? foundersPrice : regular;

  return (
    <Card className="relative overflow-hidden ring-2 ring-primary bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 text-center flex items-center justify-center gap-1">
        <Crown className="w-3.5 h-3.5" /> Statut Fondateur — Places limitées par ville
      </div>
      <CardContent className="p-5 pt-10 space-y-3">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            {plan.name}
            <Badge className="bg-primary/20 text-primary text-xs">Fondateur</Badge>
          </h3>
          <p className="text-xs text-muted-foreground">Territoire prioritaire • Prix verrouillé 10 ans</p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">{prestigePrice}$</span>
          <span className="text-sm text-muted-foreground">/mois</span>
        </div>

        {plan.appointments_range_min && (
          <Badge variant="outline" className="text-xs">
            {plan.appointments_range_min}–{plan.appointments_range_max} rendez-vous/mois
          </Badge>
        )}

        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" /> Territoire prioritaire IA</li>
          <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" /> Visibilité IA renforcée</li>
          <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" /> Prix verrouillé 10 ans</li>
          <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" /> Badge Fondateur vérifié</li>
        </ul>

        <Button onClick={() => onSelect(plan.id)} className="w-full font-semibold">
          <Crown className="w-4 h-4 mr-2" /> Réserver mon statut Fondateur
        </Button>
      </CardContent>
    </Card>
  );
}
