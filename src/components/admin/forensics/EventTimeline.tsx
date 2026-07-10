/**
 * UNPRO — Chronological event timeline.
 */
import { useState } from "react";
import type { FunnelEventRow } from "@/hooks/useContractorJourney";
import { ChevronDown, ChevronRight } from "lucide-react";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-CA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventTimeline({ events }: { events: FunnelEventRow[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (!events.length) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/30 p-4 text-sm text-muted-foreground">
        Aucun événement enregistré.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
      <h3 className="text-sm font-semibold mb-3">Timeline ({events.length})</h3>
      <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {events.map((e) => {
          const isOpen = open.has(e.id);
          const hasMeta = e.metadata && Object.keys(e.metadata).length > 0;
          return (
            <li key={e.id} className="text-xs border-l-2 border-border/30 pl-3">
              <button
                type="button"
                onClick={() => hasMeta && toggle(e.id)}
                className="w-full flex items-center gap-2 text-left"
              >
                {hasMeta ? (
                  isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                ) : (
                  <span className="w-3 h-3" />
                )}
                <span className="font-mono text-muted-foreground w-24 shrink-0">
                  {formatTime(e.created_at)}
                </span>
                <span className="font-semibold">{e.event_type}</span>
                {e.event_source && (
                  <span className="text-muted-foreground">· {e.event_source}</span>
                )}
                {e.current_path && (
                  <span className="text-muted-foreground truncate">· {e.current_path}</span>
                )}
              </button>
              {isOpen && hasMeta && (
                <pre className="mt-1 ml-5 p-2 rounded bg-black/30 text-[10px] overflow-x-auto">
                  {JSON.stringify(e.metadata, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
