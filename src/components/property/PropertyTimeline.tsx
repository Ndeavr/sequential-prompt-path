import type { PropertyEvent } from "@/types/property";
import { formatCurrency } from "@/types/property";
import { Badge } from "@/components/ui/badge";
import { Calendar, Wrench, FileSearch, Shield, Zap, Home } from "lucide-react";

const EVENT_ICONS: Record<string, typeof Wrench> = {
  renovation: Wrench,
  inspection: FileSearch,
  maintenance: Shield,
  emergency: Zap,
  purchase: Home,
};

export default function PropertyTimeline({ items }: { items: PropertyEvent[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-2">Historique</h3>
        <p className="text-sm text-muted-foreground">
          Aucun événement enregistré. L'historique se remplira au fil des travaux et inspections.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Historique & Événements</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Travaux, inspections et maintenance</p>
        </div>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>

      <div className="relative space-y-0">
        {items.map((event, i) => {
          const Icon = EVENT_ICONS[event.event_type] ?? Calendar;
          const isLast = i === items.length - 1;

          return (
            <div key={event.id} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-4 ${isLast ? "" : ""}`}>
                <div className="rounded-xl border border-border/30 bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-[10px]">{event.event_type}</Badge>
                        {event.event_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.event_date).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-sm text-foreground">{event.title}</h4>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                      )}
                    </div>
                    {event.cost != null && (
                      <span className="text-sm font-medium text-foreground shrink-0">
                        {formatCurrency(event.cost)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
