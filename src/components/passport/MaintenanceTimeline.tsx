/**
 * UNPRO — Maintenance Timeline
 * Displays property events (inspections, maintenance, repairs, upgrades) in a timeline.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wrench, Search, ArrowUpCircle, Hammer, Calendar, DollarSign,
  Plus, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AddEventDialog from "./AddEventDialog";

const EVENT_ICONS: Record<string, React.ElementType> = {
  inspection: Search,
  maintenance: Wrench,
  repair: Hammer,
  upgrade: ArrowUpCircle,
  renovation: Hammer,
};

const EVENT_COLORS: Record<string, string> = {
  inspection: "bg-accent/10 text-accent",
  maintenance: "bg-primary/10 text-primary",
  repair: "bg-warning/10 text-warning",
  upgrade: "bg-success/10 text-success",
  renovation: "bg-warning/10 text-warning",
};

interface Props {
  propertyId: string;
}

export default function MaintenanceTimeline({ propertyId }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["property-events", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_events")
        .select("*")
        .eq("property_id", propertyId)
        .order("event_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">
          Journal d'entretien
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1 text-xs">
          <Plus className="w-3 h-3" /> Ajouter
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!events || events.length === 0) && (
        <Card className="border-border/30">
          <CardContent className="p-6 text-center">
            <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucun événement enregistré. Documentez vos inspections, réparations et entretiens.
            </p>
          </CardContent>
        </Card>
      )}

      {events && events.length > 0 && (
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

          <div className="space-y-3">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.event_type] || Wrench;
              const colorClass = EVENT_COLORS[event.event_type] || "bg-muted/50 text-muted-foreground";

              return (
                <div key={event.id} className="relative flex items-start gap-3">
                  {/* Dot */}
                  <div className={`absolute -left-6 mt-1 w-[22px] h-[22px] rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-3 h-3" />
                  </div>

                  <Card className="flex-1 border-border/30">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {event.event_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {event.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.event_date).toLocaleDateString("fr-CA")}
                          </span>
                        )}
                        {event.cost != null && event.cost > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {event.cost.toLocaleString("fr-CA")} $
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
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
