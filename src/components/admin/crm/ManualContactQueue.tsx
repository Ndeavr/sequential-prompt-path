/**
 * UNPRO — Onglet « À contacter manuellement » (/admin/crm).
 * Données réelles : v_manual_contact_queue. Assignation admin ou affilié.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Search, UserPlus, Undo2, AlertTriangle } from "lucide-react";
import ManualContactPanel from "@/components/crm/ManualContactPanel";
import {
  QUEUE_FILTERS, OUTCOME_LABELS, applyQueueFilter, queueActions, queueExpectedValue,
  useEligibleAffiliates, useManualContactQueue,
  type ManualQueueRow, type QueueFilter,
} from "@/hooks/useManualContactQueue";

export default function ManualContactQueue() {
  const { rows, loading, error, reload, counts, userId } = useManualContactQueue(15_000);
  const { rows: affiliates } = useEligibleAffiliates();
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [affiliateId, setAffiliateId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let out = applyQueueFilter(rows, filter, userId);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        [r.business_name, r.city, r.category, r.phone_e164, r.email]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    return [...out].sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      return queueExpectedValue(b) - queueExpectedValue(a) || b.priority_score - a.priority_score;
    });
  }, [rows, filter, search, userId]);

  async function run(kind: "self" | "affiliate" | "unassign" | "reclaim") {
    if (selected.length === 0) return;
    if (kind === "affiliate" && !affiliateId) return toast.error("Choisissez un affilié");
    setBusy(kind);
    try {
      const r =
        kind === "self" ? await queueActions.assign(selected, { owner_user_id: userId })
        : kind === "affiliate" ? await queueActions.assign(selected, { affiliate_id: affiliateId })
        : kind === "unassign" ? await queueActions.unassign(selected)
        : await queueActions.reclaim(selected);
      toast.success(`${r.succeeded} traités · ${r.skipped} ignorés · ${r.failed} échoués`);
      setSelected([]);
      reload();
    } catch (e: any) {
      toast.error("Action échouée", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Compteurs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: "Dans la file", value: counts.total },
          { label: "Non assignés", value: counts.unassigned },
          { label: "Assignés", value: counts.assigned },
          { label: "À moi", value: counts.mine },
          { label: "En retard", value: counts.overdue },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{c.label}</p>
              <p className="text-lg font-bold tabular-nums mt-1">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-wrap items-center gap-1.5">
        {QUEUE_FILTERS.map((f) => (
          <Badge
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            className="cursor-pointer text-[10px] py-1"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Badge>
        ))}
        <div className="relative ml-auto w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…" className="pl-9 h-9 text-sm" />
        </div>
        <Button size="sm" variant="outline" className="h-9" onClick={reload}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Barre d'assignation */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-2">
          <span className="text-xs font-medium">{selected.length} sélectionnés</span>
          <Button size="sm" className="h-8 text-xs" disabled={busy !== null} onClick={() => run("self")}>
            {busy === "self" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            <UserPlus className="h-3.5 w-3.5 mr-1" /> M'assigner
          </Button>
          <Select value={affiliateId} onValueChange={setAffiliateId}>
            <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Assigner à un affilié" /></SelectTrigger>
            <SelectContent>
              {affiliates.map((a) => (
                <SelectItem key={a.affiliate_id} value={a.affiliate_id}>
                  {a.name ?? "Affilié"} · {a.active_assignments} actifs
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={busy !== null} onClick={() => run("affiliate")}>
            {busy === "affiliate" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Assigner
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={busy !== null} onClick={() => run("reclaim")}>
            {busy === "reclaim" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            <Undo2 className="h-3.5 w-3.5 mr-1" /> Récupérer (en retard)
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={busy !== null} onClick={() => run("unassign")}>
            Retirer
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelected([])}>Effacer</Button>
        </div>
      )}

      {/* Charge des affiliés */}
      {affiliates.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {affiliates.map((a) => (
            <div key={a.affiliate_id} className="shrink-0 rounded-lg border border-border/50 px-3 py-2">
              <p className="text-xs font-medium">{a.name ?? "Affilié"}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {a.active_assignments} actifs · {a.overdue} en retard · {a.activations} activations
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Liste */}
      {error ? (
        <p className="text-sm text-destructive py-8 text-center flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      ) : loading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Chargement de la file…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Aucun prospect pour ce filtre.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 150).map((r) => (
            <QueueCard
              key={r.prospect_id}
              row={r}
              checked={selected.includes(r.prospect_id)}
              onToggle={() =>
                setSelected((s) =>
                  s.includes(r.prospect_id) ? s.filter((x) => x !== r.prospect_id) : [...s, r.prospect_id],
                )
              }
              onRefresh={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueCard({
  row, checked, onToggle, onRefresh,
}: {
  row: ManualQueueRow;
  checked: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  return (
    <Card className={row.is_overdue ? "border-amber-500/50" : undefined}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{row.business_name ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {[row.city, row.category].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-bold tabular-nums">{row.priority_score}</span>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {row.activation_probability} % · {queueExpectedValue(row).toFixed(0)} $
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[9px]">{row.current_stage}</Badge>
          {row.is_unassigned
            ? <Badge variant="secondary" className="text-[9px]">Non assigné</Badge>
            : <Badge className="text-[9px]">{row.affiliate_name ?? "Admin"}</Badge>}
          {row.is_overdue && <Badge variant="destructive" className="text-[9px]">En retard</Badge>}
          {row.attempts ? <Badge variant="outline" className="text-[9px]">{row.attempts} tentatives</Badge> : null}
          {row.last_outcome && (
            <Badge variant="outline" className="text-[9px]">{OUTCOME_LABELS[row.last_outcome] ?? row.last_outcome}</Badge>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground truncate">
          {row.phone_e164 ?? "sans téléphone"} · {row.email ?? "sans courriel"}
        </p>

        {!row.is_unassigned && row.assignment_next_action && (
          <p className="text-[10px]">
            Prochaine action : <span className="font-medium">{row.assignment_next_action}</span>
            {row.due_at && ` · ${new Date(row.due_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}`}
          </p>
        )}

        <ManualContactPanel
          compact
          target={row}
          canLogOutcome={!row.is_unassigned}
          onDone={onRefresh}
        />
      </CardContent>
    </Card>
  );
}
