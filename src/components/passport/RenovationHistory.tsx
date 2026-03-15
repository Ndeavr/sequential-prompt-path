/**
 * UNPRO — Renovation History
 * Displays renovation events from property_events filtered by renovation/upgrade types.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Hammer, Calendar, DollarSign, Plus, HardHat,
} from "lucide-react";
import { useState } from "react";
import AddEventDialog from "./AddEventDialog";

interface Props {
  propertyId: string;
}

export default function RenovationHistory({ propertyId }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  const { data: renovations, isLoading } = useQuery({
    queryKey: ["property-renovations", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_events")
        .select("*")
        .eq("property_id", propertyId)
        .in("event_type", ["renovation", "upgrade"])
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">
          Historique des rénovations
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1 text-xs">
          <Plus className="w-3 h-3" /> Ajouter
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!renovations || renovations.length === 0) && (
        <Card className="border-border/30">
          <CardContent className="p-6 text-center">
            <HardHat className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucune rénovation documentée. Ajoutez vos travaux passés pour enrichir votre passeport.
            </p>
          </CardContent>
        </Card>
      )}

      {renovations && renovations.length > 0 && (
        <div className="space-y-2">
          {renovations.map((reno) => (
            <Card key={reno.id} className="border-border/30 hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-warning/10 shrink-0">
                    <Hammer className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{reno.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {reno.event_type === "upgrade" ? "Amélioration" : "Rénovation"}
                      </Badge>
                    </div>
                    {reno.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reno.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {reno.event_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(reno.event_date).toLocaleDateString("fr-CA")}
                        </span>
                      )}
                      {reno.cost != null && reno.cost > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {reno.cost.toLocaleString("fr-CA")} $
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddEventDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        propertyId={propertyId}
      />
    </div>
  );
}
