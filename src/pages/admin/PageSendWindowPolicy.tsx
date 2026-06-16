import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Channel,
  SendWindowRow,
  WEEKDAY_LABELS,
  formatRange,
  describeNextOpening,
} from "@/lib/communications/sendWindow";

type Row = SendWindowRow & { id: string; channel: Channel; notes: string | null };

const CHANNELS: Channel[] = ["sms", "email"];

export default function PageSendWindowPolicy() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("outbound_send_window_policy")
      .select("id,channel,weekday,start_minute,end_minute,enabled,notes")
      .in("channel", CHANNELS)
      .order("channel")
      .order("weekday");
    if (error) setError(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function update(id: string, patch: Partial<Row>) {
    setSavingId(id);
    const { error } = await (supabase as any)
      .from("outbound_send_window_policy")
      .update(patch)
      .eq("id", id);
    if (error) setError(error.message);
    setSavingId(null);
    await load();
  }

  function timeToMin(t: string): number {
    const [h, m] = t.split(":").map((n) => parseInt(n, 10));
    return (h || 0) * 60 + (m || 0);
  }
  function minToTime(m: number): string {
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Fenêtres d'envoi outbound</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Politique centrale appliquée à <strong>tous</strong> les agents autonomes UNPRO.
            Heure de Montréal. Les messages transactionnels (OTP, confirmations, réponses) ne sont jamais bloqués.
          </p>
        </header>

        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {loading && <div className="text-muted-foreground">Chargement…</div>}

        {!loading && CHANNELS.map((ch) => {
          const chRows = rows.filter((r) => r.channel === ch).sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
          const status = describeNextOpening(chRows);
          return (
            <section key={ch} className="rounded-2xl border border-border bg-card overflow-hidden">
              <header className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-medium uppercase tracking-wide">{ch}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{status.label}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  status.open ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                              : "bg-amber-500/15 text-amber-200 border-amber-400/30"
                }`}>
                  {status.open ? "Fenêtre ouverte" : "Fenêtre fermée"}
                </span>
              </header>
              <div className="divide-y divide-border">
                {chRows.map((r) => (
                  <div key={r.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                    <div className="col-span-3 text-sm font-medium">{WEEKDAY_LABELS[r.weekday]}</div>
                    <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={(e) => update(r.id, { enabled: e.target.checked } as any)}
                        disabled={savingId === r.id}
                      />
                      Actif
                    </label>
                    <div className="col-span-3 flex items-center gap-2">
                      <input
                        type="time"
                        className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                        value={minToTime(r.start_minute)}
                        onChange={(e) => update(r.id, { start_minute: timeToMin(e.target.value) } as any)}
                        disabled={savingId === r.id || !r.enabled}
                      />
                      <span className="text-muted-foreground text-xs">→</span>
                      <input
                        type="time"
                        className="bg-background border border-border rounded-md px-2 py-1 text-sm"
                        value={minToTime(r.end_minute)}
                        onChange={(e) => update(r.id, { end_minute: timeToMin(e.target.value) } as any)}
                        disabled={savingId === r.id || !r.enabled}
                      />
                    </div>
                    <div className="col-span-4 text-xs text-muted-foreground">{formatRange(r)}</div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <footer className="text-xs text-muted-foreground pt-4">
          Founder Mode contourne la fenêtre. Les exceptions transactionnelles (OTP, reset, paiement, RDV, réponses, alertes) sont toujours envoyées.
        </footer>
      </div>
    </div>
  );
}
