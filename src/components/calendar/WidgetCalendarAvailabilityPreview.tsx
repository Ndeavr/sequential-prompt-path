/**
 * WidgetCalendarAvailabilityPreview — real synchronized busy times only.
 * Reads the owner's calendar_connections state and calendar_busy_periods (owner RLS)
 * for the connected Google calendar. Never fabricates slots.
 */
import { Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarConnections } from "@/hooks/useCalendarConnection";

type BusyPeriod = { starts_at: string; ends_at: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-CA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function WidgetCalendarAvailabilityPreview({ role: _role }: { role: string }) {
  const { google, readiness, loading, error } = useCalendarConnections();
  const [periods, setPeriods] = useState<BusyPeriod[] | null>(null);
  const [readError, setReadError] = useState(false);
  const connectionId = readiness === "ready" ? google?.id ?? null : null;

  useEffect(() => {
    if (!connectionId) { setPeriods(null); return; }
    let live = true;
    setReadError(false);
    supabase
      .from("calendar_busy_periods")
      .select("starts_at, ends_at")
      .eq("calendar_connection_id", connectionId)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(4)
      .then(({ data, error: e }) => {
        if (!live) return;
        if (e) { setReadError(true); setPeriods(null); return; }
        setPeriods((data ?? []) as BusyPeriod[]);
      });
    return () => { live = false; };
  }, [connectionId]);

  let body: React.ReactNode;
  if (loading || (connectionId && periods === null && !readError)) {
    body = (
      <p role="status" className="flex items-center gap-2 text-xs text-foreground">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Vérification de votre agenda…
      </p>
    );
  } else if (error || readError) {
    body = <p role="alert" className="text-xs text-foreground">Nous n'avons pas pu lire vos disponibilités.</p>;
  } else if (readiness === "no_selection") {
    body = <p className="text-xs text-foreground">Choisissez votre calendrier</p>;
  } else if (readiness !== "ready") {
    body = <p className="text-xs text-foreground">Disponibilités non encore synchronisées</p>;
  } else if (!periods || periods.length === 0) {
    body = (
      <p className="text-xs text-foreground">
        Aucune plage occupée synchronisée à venir
        {google?.last_synced_at ? ` · dernière synchro ${fmt(google.last_synced_at)}` : ""}
      </p>
    );
  } else {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {periods.map((p) => (
          <div key={`${p.starts_at}-${p.ends_at}`} className="rounded-lg bg-muted/20 border border-border/20 px-3 py-2">
            <p className="text-xs text-foreground capitalize">{fmt(p.starts_at)}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 bg-card/60 p-4" data-calendar-readiness={readiness}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          {readiness === "ready" && periods && periods.length > 0 ? "Plages occupées synchronisées" : "Disponibilités"}
        </h4>
      </div>
      {body}
    </div>
  );
}
