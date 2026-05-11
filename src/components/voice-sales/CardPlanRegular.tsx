import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";

interface Props {
  plan: any;
  recommended?: boolean;
  onSelect: (planId: string) => void;
}

export default function CardPlanRegular({ plan, recommended, onSelect }: Props) {
  return (
    <Card className={`relative overflow-hidden transition-all ${recommended ? "ring-2 ring-primary shadow-lg" : "hover:ring-1 hover:ring-primary/30"}`}>
      {recommended && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
          <Star className="w-3 h-3" /> Recommandé
        </div>
      )}
      <CardContent className="p-5 space-y-3">
        <div>
          <h3 className="font-bold text-lg">{plan.name}</h3>
          {plan.tagline && <p className="text-xs text-muted-foreground">{plan.tagline}</p>}
        </div>

        {plan.appointments_range_min && (
          <div className="space-y-0.5">
            <p className="text-2xl font-black text-foreground leading-none">
              {plan.appointments_range_min}{plan.appointments_range_max && plan.appointments_range_max !== plan.appointments_range_min ? `–${plan.appointments_range_max}` : ""}
            </p>
            <p className="text-xs font-medium text-muted-foreground">rendez-vous qualifiés inclus / mois</p>
          </div>
        )}

        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold">{formatPrice((plan.monthly_price ?? 0) / 100)}</span>
          <span className="text-sm text-muted-foreground">/mois</span>
        </div>

        {plan.short_pitch && (
          <p className="text-sm text-muted-foreground">{plan.short_pitch}</p>
        )}

        <Button onClick={() => onSelect(plan.id)} className="w-full" variant={recommended ? "default" : "outline"}>
          <Check className="w-4 h-4 mr-2" />
          Choisir ce plan
        </Button>
      </CardContent>
    </Card>
  );
}
