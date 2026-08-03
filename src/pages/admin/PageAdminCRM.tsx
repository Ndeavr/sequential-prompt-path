/**
 * UNPRO — CRM Operations Console (/admin/crm)
 * Live source: v_crm_prospects. Recovery: crm-recovery-action. No mock data.
 */
import { useMemo, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  CRM_STAGES,
  SMART_FILTERS,
  BLOCKED_REASON_LABELS,
  NEXT_ACTION_LABELS,
  applySmartFilter,
  actionsForStage,
  expectedValue,
  runCrmAction,
  useCrmProspects,
  useRevenueScoreboard,
  type CrmProspect,
  type SmartFilter,
} from "@/hooks/useCrmOperations";
import CrmProspectDrawer from "@/components/admin/crm/CrmProspectDrawer";
import { RefreshCw, Search, Loader2, AlertTriangle, Target, Zap } from "lucide-react";

const kpiCards = (k: ReturnType<typeof useCrmProspects>["kpis"]) => [
  { label: "Revenu aujourd'hui", value: `${k.revenueToday.toFixed(2)} $` },
  { label: "Activations 1 $", value: k.activations },
  { label: "Plans payants", value: k.paidPlans },
  { label: "Succès SMS", value: `${k.smsSuccess} %` },
  { label: "Succès courriel", value: `${k.emailSuccess} %` },
  { label: "Échecs SMS", value: k.failedSms },
  { label: "Checkout abandonné", value: k.checkoutAbandoned },
  { label: "Revenu récupérable", value: `${k.recoverable.toFixed(2)} $` },
  { label: "Délai moyen → 1 $", value: `${k.avgHoursToActivation} h` },
];

export default function PageAdminCRM() {
  const { rows, loading, reload, stageCounts, kpis } = useCrmProspects(10_000);
  const { data: scoreboard } = useRevenueScoreboard(15_000);
  const [stage, setStage] = useState<string>("all");
  const [filter, setFilter] = useState<SmartFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [operatorMode, setOperatorMode] = useState(false);

  const filtered = useMemo(() => {
    let out = applySmartFilter(rows, filter);
    if (stage !== "all") out = out.filter((r) => r.current_stage === stage);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        [r.business_name, r.city, r.category, r.phone_e164, r.email]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    if (operatorMode) {
      out = out
        .filter((r) => !r.paid_at && !r.opted_out && r.next_best_action !== "none")
        .sort((a, b) => expectedValue(b) - expectedValue(a));
    }
    return out;
  }, [rows, filter, stage, search, operatorMode]);

  const queue = useMemo(
    () => (operatorMode ? filtered.slice(0, 10) : []),
    [operatorMode, filtered],
  );


  const bulk = async (action: string) => {
    if (selected.length === 0) return;
    setBusy(action);
    try {
      const r = await runCrmAction(action, selected, { reason: "crm_bulk" });
      toast.success(`Lot exécuté — ${r.succeeded} réussis, ${r.skipped} ignorés, ${r.failed} échoués`);
      setSelected([]);
      reload();
    } catch (e: any) {
      toast.error("Lot échoué", { description: e?.message });
    } finally {
      setBusy(null);
    }
  };

  const drawerProspect = rows.find((r) => r.prospect_id === drawerId) ?? null;

  return (
    <AdminLayout>
      <div className="space-y-4 p-3 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">CRM Acquisition</h1>
            <p className="text-xs text-muted-foreground">
              Qui a besoin d'attention, pourquoi, et quoi faire — actualisé aux 10 secondes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={operatorMode ? "default" : "outline"}
              className="h-9"
              onClick={() => setOperatorMode((v) => !v)}
            >
              <Target className="h-4 w-4 mr-2" /> Mode opérateur
            </Button>
            <Button size="sm" variant="outline" onClick={reload} className="h-9">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
            </Button>
          </div>
        </div>

        {/* Tableau des revenus */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { label: "Revenu aujourd'hui", value: `${((scoreboard?.revenue_today_cents ?? 0) / 100).toFixed(2)} $` },
            { label: "Hier", value: `${((scoreboard?.revenue_yesterday_cents ?? 0) / 100).toFixed(2)} $` },
            { label: "7 jours", value: `${((scoreboard?.revenue_7d_cents ?? 0) / 100).toFixed(2)} $` },
            { label: "30 jours", value: `${((scoreboard?.revenue_30d_cents ?? 0) / 100).toFixed(2)} $` },
            { label: "Activations aujourd'hui", value: scoreboard?.activations_today ?? 0 },
            { label: "Activations totales", value: scoreboard?.activations_total ?? 0 },
          ].map((c) => (
            <Card key={c.label} className="border-primary/20">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{c.label}</p>
                <p className="text-lg font-bold tabular-nums mt-1">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* File prioritaire du mode opérateur */}
        {operatorMode && queue.length > 0 && (
          <Card className="border-primary/40">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" /> File prioritaire — 10 prochaines actions
              </p>
              <div className="space-y-1.5">
                {queue.map((r, i) => (
                  <div key={r.prospect_id} className="flex items-center gap-2 rounded-md border border-border/50 p-2">
                    <span className="text-xs font-bold tabular-nums w-5 text-muted-foreground">{i + 1}</span>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setDrawerId(r.prospect_id)}>
                      <p className="text-sm font-medium truncate">{r.business_name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {BLOCKED_REASON_LABELS[r.blocked_reason] ?? r.blocked_reason} · {r.activation_probability} % ·
                        {" "}{expectedValue(r).toFixed(2)} $ attendus
                      </p>
                    </button>
                    <Button
                      size="sm"
                      className="h-8 text-[11px] shrink-0"
                      disabled={busy !== null}
                      onClick={async () => {
                        setBusy(r.prospect_id + r.next_best_action);
                        try {
                          const res = await runCrmAction(r.next_best_action, [r.prospect_id], { reason: "operator_mode" });
                          if (res.failed > 0) toast.error("Action échouée");
                          else if (res.skipped > 0) toast.info("Déjà effectuée aujourd'hui");
                          else toast.success("Action exécutée");
                          reload();
                        } catch (e: any) {
                          toast.error("Action échouée", { description: e?.message });
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      {busy === r.prospect_id + r.next_best_action && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {NEXT_ACTION_LABELS[r.next_best_action] ?? r.next_best_action}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}


        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-9 gap-2">
          {kpiCards(kpis).map((c) => (
            <Card key={c.label}>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{c.label}</p>
                <p className="text-lg font-bold tabular-nums mt-1">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stage rail */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            size="sm"
            variant={stage === "all" ? "default" : "outline"}
            className="h-8 text-xs shrink-0"
            onClick={() => setStage("all")}
          >
            Tous <span className="ml-1 tabular-nums opacity-70">{rows.length}</span>
          </Button>
          {CRM_STAGES.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={stage === s.key ? "default" : "outline"}
              className="h-8 text-xs shrink-0"
              onClick={() => setStage(s.key)}
            >
              {s.label} <span className="ml-1 tabular-nums opacity-70">{stageCounts[s.key] ?? 0}</span>
            </Button>
          ))}
        </div>

        {/* Smart filters + search */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {SMART_FILTERS.map((f) => (
              <Badge
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                className="cursor-pointer text-[10px] py-1"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Badge>
            ))}
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher entreprise, ville, téléphone…"
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Bulk bar */}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-2">
            <span className="text-xs font-medium">{selected.length} sélectionnés</span>
            {["retry_sms", "second_sms", "onboarding_email", "payment_email", "validate_phone", "pause", "archive"].map((a) => (
              <Button key={a} size="sm" variant="outline" className="h-8 text-xs" disabled={busy !== null} onClick={() => bulk(a)}>
                {busy === a && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {a === "retry_sms" ? "Renvoyer SMS"
                  : a === "second_sms" ? "2e SMS"
                  : a === "onboarding_email" ? "Courriel onboarding"
                  : a === "payment_email" ? "Courriel paiement"
                  : a === "validate_phone" ? "Valider téléphones"
                  : a === "pause" ? "Pause" : "Archiver"}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelected([])}>Effacer</Button>
          </div>
        )}

        {/* Cards */}
        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Aucun prospect pour ce filtre.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, 200).map((r) => (
              <ProspectCard
                key={r.prospect_id}
                row={r}
                checked={selected.includes(r.prospect_id)}
                onToggle={() =>
                  setSelected((s) =>
                    s.includes(r.prospect_id) ? s.filter((x) => x !== r.prospect_id) : [...s, r.prospect_id],
                  )
                }
                onOpen={() => setDrawerId(r.prospect_id)}
                onAction={async (a) => {
                  setBusy(r.prospect_id + a);
                  try {
                    const res = await runCrmAction(a, [r.prospect_id]);
                    if (res.failed > 0) toast.error("Action échouée");
                    else if (res.skipped > 0) toast.info("Déjà effectuée aujourd'hui");
                    else toast.success("Action exécutée");
                    reload();
                  } catch (e: any) {
                    toast.error("Action échouée", { description: e?.message });
                  } finally {
                    setBusy(null);
                  }
                }}
                busyKey={busy}
              />
            ))}
          </div>
        )}
      </div>

      <CrmProspectDrawer
        prospect={drawerProspect}
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        onRefresh={reload}
      />
    </AdminLayout>
  );
}

function ProspectCard({
  row, checked, onToggle, onOpen, onAction, busyKey,
}: {
  row: CrmProspect;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onAction: (a: string) => void;
  busyKey: string | null;
}) {
  const actions = actionsForStage(row).slice(0, 2);
  const tone =
    row.priority_score >= 90 ? "text-red-400"
      : row.priority_score >= 60 ? "text-amber-400"
      : "text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
          <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
            <p className="text-sm font-semibold truncate">{row.business_name ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {[row.city, row.category].filter(Boolean).join(" · ") || "—"}
            </p>
          </button>
          <div className="text-right shrink-0">
            <span className={`text-sm font-bold tabular-nums ${tone}`}>{row.priority_score}</span>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {row.activation_probability} % · {expectedValue(row).toFixed(0)} $
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[9px]">{row.current_stage}</Badge>
          <Badge variant="secondary" className="text-[9px]">
            {BLOCKED_REASON_LABELS[row.blocked_reason] ?? row.blocked_reason}
          </Badge>
          {row.no_email && <Badge variant="outline" className="text-[9px]">sans courriel</Badge>}
          {row.phone_invalid && <Badge variant="outline" className="text-[9px]">tél. invalide</Badge>}
          {row.opted_out && <Badge variant="destructive" className="text-[9px]">désabonné</Badge>}
          {row.hours_since_last_activity != null && (
            <Badge variant="outline" className="text-[9px]">{Math.round(row.hours_since_last_activity)} h</Badge>
          )}
        </div>

        {row.last_error && (
          <p className="text-[10px] text-destructive flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="truncate">{row.last_error}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {actions.map((a) => (
            <Button
              key={a.action}
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              disabled={a.disabled || row.opted_out || busyKey !== null}
              onClick={() => onAction(a.action)}
            >
              {busyKey === row.prospect_id + a.action && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {a.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onOpen}>Détails</Button>
        </div>
      </CardContent>
    </Card>
  );
}
