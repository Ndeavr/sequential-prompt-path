/**
 * UNPRO — Admin: Last 100 contacted contractors + failure CSV export.
 * Read-only funnel view. No retry actions.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RotateCw } from "lucide-react";

type Lead = {
  id: string;
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  pipeline_status: string | null;
  activation_status: string | null;
  payment_status: string | null;
  failure_code: string | null;
  last_sms_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  onboarding_started_at: string | null;
  payment_started_at: string | null;
  paid_at: string | null;
  updated_at: string;
};

type LogRow = {
  lead_id: string;
  channel: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  sent_at: string;
  clicked_at: string | null;
  opened_at: string | null;
};

type Row = Lead & {
  sms_status: string | null;
  sms_error_code: string | null;
  sms_error_message: string | null;
  sms_sent_at: string | null;
  delivered: boolean;
  clicked: boolean;
};

function Pill({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  const color = ok ? "bg-green-500/15 text-green-400 border-green-500/30"
    : warn ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-white/5 text-muted-foreground border-white/10";
  return <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium border ${color}`}>{label}</span>;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
}

export default function PageAdminContractorsContacted() {
  const [exporting, setExporting] = useState(false);

  const query = useQuery({
    queryKey: ["admin-contractors-contacted"],
    queryFn: async (): Promise<Row[]> => {
      const { data: leads, error } = await (supabase as any)
        .from("contractor_leads")
        .select("id,company_name,full_name,phone,mobile_phone,city,pipeline_status,activation_status,payment_status,failure_code,last_sms_at,opened_at,clicked_at,onboarding_started_at,payment_started_at,paid_at,updated_at")
        .not("last_sms_at", "is", null)
        .order("last_sms_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const leadRows = (leads ?? []) as Lead[];
      const ids = leadRows.map(l => l.id);
      let logsByLead = new Map<string, LogRow>();
      if (ids.length > 0) {
        const { data: logs } = await (supabase as any)
          .from("contractor_outreach_logs")
          .select("lead_id,channel,status,error_code,error_message,sent_at,clicked_at,opened_at")
          .in("lead_id", ids)
          .eq("channel", "sms")
          .order("sent_at", { ascending: false });
        for (const log of (logs ?? []) as LogRow[]) {
          if (!logsByLead.has(log.lead_id)) logsByLead.set(log.lead_id, log);
        }
      }
      return leadRows.map(l => {
        const log = logsByLead.get(l.id);
        return {
          ...l,
          sms_status: log?.status ?? null,
          sms_error_code: log?.error_code ?? null,
          sms_error_message: log?.error_message ?? null,
          sms_sent_at: log?.sent_at ?? l.last_sms_at,
          delivered: log?.status === "delivered",
          clicked: !!(log?.clicked_at || l.clicked_at),
        };
      });
    },
  });

  const totals = useMemo(() => {
    const rows = query.data ?? [];
    return {
      total: rows.length,
      sent: rows.filter(r => r.sms_status && r.sms_status !== "failed").length,
      delivered: rows.filter(r => r.delivered).length,
      clicked: rows.filter(r => r.clicked).length,
      signup: rows.filter(r => r.onboarding_started_at).length,
      paid: rows.filter(r => r.paid_at).length,
      failed: rows.filter(r => r.sms_status === "failed" || r.failure_code).length,
    };
  }, [query.data]);

  async function exportFailures() {
    setExporting(true);
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: logs } = await (supabase as any)
        .from("contractor_outreach_logs")
        .select("lead_id,channel,to_address,status,error_code,error_message,sent_at,template_key")
        .eq("channel", "sms")
        .eq("status", "failed")
        .gte("sent_at", since)
        .order("sent_at", { ascending: false })
        .limit(5000);
      const leadIds = Array.from(new Set(((logs ?? []) as any[]).map(l => l.lead_id)));
      const leadsMap = new Map<string, Lead>();
      if (leadIds.length) {
        const { data: leads } = await (supabase as any)
          .from("contractor_leads")
          .select("id,company_name,full_name,city,phone,pipeline_status,failure_code")
          .in("id", leadIds);
        for (const l of (leads ?? []) as Lead[]) leadsMap.set(l.id, l);
      }
      const csvRows = ((logs ?? []) as any[]).map(l => {
        const lead = leadsMap.get(l.lead_id);
        return {
          sent_at: l.sent_at,
          business_name: lead?.company_name ?? lead?.full_name ?? "",
          city: lead?.city ?? "",
          phone: l.to_address,
          channel: l.channel,
          template: l.template_key,
          sms_status: l.status,
          error_code: l.error_code ?? "",
          error_message: (l.error_message ?? "").slice(0, 300),
          lead_pipeline_status: lead?.pipeline_status ?? "",
          lead_failure_code: lead?.failure_code ?? "",
        };
      });
      const csv = toCsv(csvRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unpro-outreach-failures-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const rows = query.data ?? [];

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Derniers 100 entrepreneurs contactés</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vue funnel unifiée: SMS envoyé → livré → cliqué → inscription → paiement → activation.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${query.isFetching ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
            <Button size="sm" onClick={exportFailures} disabled={exporting}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {exporting ? "Export…" : "Exporter les échecs (CSV)"}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {[
            ["Total", totals.total, ""],
            ["Envoyés", totals.sent, "text-blue-400"],
            ["Livrés", totals.delivered, "text-green-400"],
            ["Cliqués", totals.clicked, "text-cyan-400"],
            ["Inscriptions", totals.signup, "text-amber-400"],
            ["Payés", totals.paid, "text-green-500"],
            ["Échecs", totals.failed, "text-red-400"],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className={`mt-1 text-2xl font-semibold ${color as string}`}>{value as number}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] uppercase">
                <TableHead>Entrepreneur</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>SMS</TableHead>
                <TableHead>Livré</TableHead>
                <TableHead>Cliqué</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Complétée</TableHead>
                <TableHead>Payé</TableHead>
                <TableHead>Activation</TableHead>
                <TableHead>Échec</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Chargement…</TableCell></TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Aucun entrepreneur contacté récemment.</TableCell></TableRow>
              )}
              {rows.map(r => {
                const err = r.sms_status === "failed" || r.failure_code;
                return (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell>
                      <div className="font-medium">{r.company_name ?? r.full_name ?? "—"}</div>
                      {r.city && <div className="text-[10px] text-muted-foreground">{r.city}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{r.phone ?? r.mobile_phone ?? "—"}</TableCell>
                    <TableCell>
                      {r.sms_status
                        ? <Pill ok={r.sms_status !== "failed"} warn={r.sms_status === "queued"} label={r.sms_status} />
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{r.delivered ? <Pill ok label="✓" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{r.clicked ? <Pill ok label="✓" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{r.onboarding_started_at ? <Pill ok label="✓" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{r.pipeline_status === "onboarding_completed" || r.paid_at ? <Pill ok label="✓" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{r.paid_at ? <Pill ok label="✓" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Pill
                        ok={r.activation_status === "active" || r.pipeline_status === "profile_active"}
                        warn={r.activation_status === "in_progress"}
                        label={r.activation_status ?? "—"}
                      />
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {err ? (
                        <div>
                          <div className="text-red-400 font-mono text-[10px]">{r.sms_error_code ?? r.failure_code}</div>
                          {r.sms_error_message && <div className="text-[10px] text-muted-foreground truncate" title={r.sms_error_message}>{r.sms_error_message}</div>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
