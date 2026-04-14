import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Package } from "lucide-react";
import { useLeadPacks } from "@/hooks/useVoiceSales";

interface Props {
  selectedPackId: string | null;
  onSelect: (packId: string | null) => void;
}

export default function PanelLeadPackSelector({ selectedPackId, onSelect }: Props) {
  const { data: packs } = useLeadPacks();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Leads supplémentaires à la carte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(packs ?? []).map((pack: any) => (
          <button
            key={pack.id}
            onClick={() => onSelect(selectedPackId === pack.id ? null : pack.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
              selectedPackId === pack.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs font-bold">{pack.pack_quantity}</Badge>
              <span className="text-sm font-medium">{pack.pack_name}</span>
            </div>
            <span className="text-sm font-bold">{pack.pack_price}$</span>
          </button>
        ))}
        <p className="text-xs text-muted-foreground text-center pt-1">
          Ajoutés à votre plan mensuel
        </p>
      </CardContent>
    </Card>
  );
}
