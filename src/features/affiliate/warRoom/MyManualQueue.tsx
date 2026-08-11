/**
 * UNPRO — « À contacter aujourd'hui » (affilié).
 * Source RLS : manual_queue_for_me() — l'affilié ne voit que ses assignations.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import ManualContactPanel from "@/components/crm/ManualContactPanel";
import { OUTCOME_LABELS } from "@/hooks/useManualContactQueue";

type Row = {
  prospect_id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  phone_e164: string | null;
  email: string | null;
  current_stage: string | null;
  priority_score: number | null;
  next_action: string | null;
  due_at: string | null;
  attempts: number | null;
  last_outcome: string | null;
  activation_token: string | null;
  is_overdue: boolean | null;
};

export function MyManualQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await (supabase as any).rpc("manual_queue_for_me");
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground rounded-2xl border border-border/40 bg-card p-5">
        Aucun prospect assigné pour le moment. Vous recevrez un courriel dès qu'un prospect vous sera attribué.
      </p>
    );

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((r) => (
        <div
          key={r.prospect_id}
          className={`rounded-2xl border p-4 bg-card space-y-2 ${r.is_overdue ? "border-amber-500/50" : "border-border/40"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{r.business_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[r.city, r.category].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums">{r.priority_score ?? 0}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {r.current_stage && <Badge variant="outline" className="text-[9px]">{r.current_stage}</Badge>}
            {r.is_overdue && <Badge variant="destructive" className="text-[9px]">En retard</Badge>}
            {r.attempts ? <Badge variant="outline" className="text-[9px]">{r.attempts} tentatives</Badge> : null}
            {r.last_outcome && (
              <Badge variant="outline" className="text-[9px]">{OUTCOME_LABELS[r.last_outcome] ?? r.last_outcome}</Badge>
            )}
          </div>

          {r.next_action && (
            <p className="text-[11px] text-muted-foreground">
              Prochaine action : <span className="font-medium text-foreground">{r.next_action}</span>
              {r.due_at && ` · ${new Date(r.due_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}`}
            </p>
          )}

          <ManualContactPanel compact target={r} onDone={load} />
        </div>
      ))}
    </div>
  );
}

export default MyManualQueue;
