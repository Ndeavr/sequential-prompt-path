// Smart Contact Router — admin cockpit (/admin/communications)
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, Mail, MessageSquare, Phone, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

interface Rule {
  id: string; rule_name: string; priority: number;
  condition_type: string; primary_channel: "sms" | "email";
  fallback_channel: "sms" | "email" | null;
  delay_before_fallback_minutes: number; is_active: boolean;
  description?: string | null;
}

interface Log {
  id: string; created_at: string; channel: string;
  template_key: string | null; delivery_status: string;
  provider: string | null; provider_message_id: string | null;
  error_message: string | null; fallback_triggered: boolean;
  contact_id: string | null;
}

interface KPI { smsSent: number; smsDelivered: number; emailSent: number; emailDelivered: number; failed: number; fallbacks: number; }

const statusTone: Record<string, string> = {
  queued: "bg-white/10 text-white/70",
  sent: "bg-cyan-500/15 text-cyan-300",
  delivered: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-rose-500/15 text-rose-300",
  undelivered: "bg-rose-500/15 text-rose-300",
  bounced: "bg-amber-500/15 text-amber-300",
  complained: "bg-amber-500/15 text-amber-300",
};

export default function PageAdminCommunications() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    // Exact server-side counts: never silently truncate daily totals at the API row limit.
    // These figures describe communication_logs ONLY, not all acquisition SMS/email or Gmail.
    const countLogs = (channel: "sms" | "email" | null, statuses?: string[], fallbackOnly = false) => {
      let q = supabase.from("communication_logs").select("id", { count: "exact", head: true }).gte("created_at", since);
      if (channel) q = q.eq("channel", channel);
      if (statuses) q = q.in("delivery_status", statuses);
      if (fallbackOnly) q = q.eq("fallback_triggered", true);
      return q;
    };

    try {
      const [rulesQ, logsQ, smsAttemptQ, smsDeliveredQ, emailAttemptQ, emailDeliveredQ, failedQ, fallbackQ] = await Promise.all([
        supabase.from("outbound_contact_rules").select("*").order("priority", { ascending: true }),
        supabase.from("communication_logs").select("*").order("created_at", { ascending: false }).limit(80),
        countLogs("sms", ["sent", "delivered", "undelivered", "read"]),
        countLogs("sms", ["delivered", "read"]),
        countLogs("email", ["sent", "delivered", "bounced", "complained"]),
        countLogs("email", ["delivered"]),
        countLogs(null, ["failed", "undelivered", "bounced", "complained", "blocked"]),
        countLogs(null, undefined, true),
      ]);

      setRules(rulesQ.error ? [] : ((rulesQ.data ?? []) as Rule[]));
      setLogs(logsQ.error ? [] : ((logsQ.data ?? []) as Log[]));

      const metricQueries = [smsAttemptQ, smsDeliveredQ, emailAttemptQ, emailDeliveredQ, failedQ, fallbackQ];
      const metricsValid = metricQueries.every((r) => !r.error && typeof r.count === "number");
      setKpi(metricsValid ? {
        smsSent: smsAttemptQ.count!,
        smsDelivered: smsDeliveredQ.count!,
        emailSent: emailAttemptQ.count!,
        emailDelivered: emailDeliveredQ.count!,
        failed: failedQ.count!,
        fallbacks: fallbackQ.count!,
      } : null);
      setDataError(rulesQ.error || logsQ.error || !metricsValid
        ? "Lecture incomplète des journaux. Les valeurs indisponibles ne signifient pas zéro. Vérifiez l'accès à la base et réessayez."
        : null);
    } catch {
      setRules([]);
      setLogs([]);
      setKpi(null);
      setDataError("Impossible de joindre le registre des communications. Aucun total ne peut être certifié.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("comm-logs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "communication_logs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleRule = async (r: Rule, active: boolean) => {
    const { error } = await supabase.from("outbound_contact_rules").update({ is_active: active }).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success(`Règle "${r.rule_name}" ${active ? "activée" : "désactivée"}`); load(); }
  };

  const updateDelay = async (r: Rule, value: number) => {
    const { error } = await supabase.from("outbound_contact_rules").update({ delay_before_fallback_minutes: value }).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  };



  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Routage des communications</h1>
            <p className="mt-2 text-sm text-white/60">Journaux du routeur (24 h). Les SMS d’acquisition, les courriels marketing et Gmail ont d’autres registres : ce tableau n’est pas le total UNPRO.</p>
          </div>
          <Button variant="ghost" onClick={load} className="gap-2 text-white/70 hover:text-white">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>

        {dataError && <p role="alert" className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">{dataError}</p>}

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-6">
          <KpiCard icon={<MessageSquare className="h-4 w-4" />} label="SMS signalés envoyés (24 h)" value={kpi?.smsSent ?? "—"} />
          <KpiCard icon={<Zap className="h-4 w-4" />} label="SMS livrés (confirmés)" value={kpi?.smsDelivered ?? "—"} accent="emerald" />
          <KpiCard icon={<Mail className="h-4 w-4" />} label="Courriels signalés envoyés" value={kpi?.emailSent ?? "—"} />
          <KpiCard icon={<Mail className="h-4 w-4" />} label="Courriels livrés (confirmés)" value={kpi?.emailDelivered ?? "—"} accent="emerald" />
          <KpiCard icon={<Activity className="h-4 w-4" />} label="Échecs / blocages" value={kpi?.failed ?? "—"} accent="rose" />
          <KpiCard icon={<RefreshCw className="h-4 w-4" />} label="Relais déclenchés" value={kpi?.fallbacks ?? "—"} accent="cyan" />
        </div>

        {/* Routing Rules */}
        <Glass className="mb-8 p-6">
          <h2 className="mb-4 text-lg font-medium">Règles de routage</h2>
          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/60">P{r.priority}</Badge>
                  <div>
                    <div className="font-medium">{r.rule_name}</div>
                    <div className="text-xs text-white/50">{r.description || r.condition_type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-300">→ {r.primary_channel}</span>
                  {r.fallback_channel && (
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-white/70">relais {r.fallback_channel}</span>
                  )}
                  {r.fallback_channel && (
                    <div className="flex items-center gap-2 text-white/60">
                      <span className="text-xs">délai (min)</span>
                      <Input
                        type="number"
                        defaultValue={r.delay_before_fallback_minutes}
                        onBlur={(e) => updateDelay(r, parseInt(e.target.value || "0", 10))}
                        className="h-8 w-20 border-white/10 bg-white/[0.03]"
                      />
                    </div>
                  )}
                  <Switch checked={r.is_active} onCheckedChange={(v) => toggleRule(r, v)} />
                </div>
              </div>
            ))}
            {rules.length === 0 && !loading && !dataError && <p className="text-sm text-white/40">Aucune règle.</p>}
          </div>
        </Glass>

        {/* No live-send smoke test in a read-only monitoring screen: prior test forged consent flags. */}

        {/* Live feed */}
        <Glass className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Derniers événements du routeur</h2>
            <Badge variant="outline" className="border-white/20 text-white/60">Journaux</Badge>
          </div>
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {l.channel === "sms" ? <Phone className="h-4 w-4 text-cyan-300 shrink-0" /> : <Mail className="h-4 w-4 text-white/60 shrink-0" />}
                  <span className="text-white/40 text-xs">{new Date(l.created_at).toLocaleTimeString("fr-CA")}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusTone[l.delivery_status] ?? "bg-white/5 text-white/60"}`}>{l.delivery_status}</span>
                  {l.fallback_triggered && <Badge variant="outline" className="border-cyan-400/30 bg-cyan-500/10 text-[10px] text-cyan-300">fallback</Badge>}
                  <span className="ml-auto text-xs text-white/40 truncate max-w-[120px]">{l.provider || "—"}</span>
                </div>
                <div className="mt-2 flex flex-col gap-1 min-w-0">
                  <span className="font-mono text-xs text-white/70 break-all">{l.template_key || "—"}</span>
                  {l.error_message && <span className="text-xs text-rose-300 break-words">{l.error_message}</span>}
                </div>
              </div>
            ))}
            {logs.length === 0 && !loading && !dataError && <p className="text-sm text-white/40">Aucun événement récent dans ce registre.</p>}
          </div>
        </Glass>
      </div>
    </div>
  );
}

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`rounded-[28px] border-white/[0.06] bg-white/[0.04] backdrop-blur-2xl ${className}`}>{children}</Card>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: "emerald" | "rose" | "cyan" }) {
  const tone = accent === "emerald" ? "text-emerald-300" : accent === "rose" ? "text-rose-300" : accent === "cyan" ? "text-cyan-300" : "text-white";
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-2 text-xs text-white/50">{icon}<span>{label}</span></div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${tone}`}>{value}</div>
    </Glass>
  );
}
