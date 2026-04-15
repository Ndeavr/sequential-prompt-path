import type { SimulationEvent } from "@/hooks/useQASimulation";

interface Props {
  events: SimulationEvent[];
}

export default function TableSimulationEvents({ events }: Props) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Aucun événement</p>;

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {events.map((ev) => (
        <div key={ev.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/10 text-sm">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            ev.status === "success" ? "bg-emerald-400" :
            ev.status === "error" ? "bg-red-400" : "bg-muted-foreground"
          }`} />
          <span className="text-foreground truncate">{ev.event_label || ev.event_type}</span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {new Date(ev.created_at).toLocaleTimeString("fr-CA")}
          </span>
        </div>
      ))}
    </div>
  );
}
