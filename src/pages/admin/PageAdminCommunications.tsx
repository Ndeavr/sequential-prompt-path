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
  const [kpi, setKpi] = useState<KPI>({ smsSent: 0, smsDelivered: 0, emailSent: 0, emailDelivered: 0, failed: 0, fallbacks: 0 });
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  const load = async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [rulesQ, logsQ, kpiQ] = await Promise.all([
      supabase.from("outbound_contact_rules").select("*").order("priority", { ascending: true }),
      supabase.from("communication_logs").select("*").order("created_at", { ascending: false }).limit(80),
      supabase.from("communication_logs").select("channel,delivery_status,fallback_triggered").gte("created_at", since),
    ]);
    if (rulesQ.data) setRules(rulesQ.data as Rule[]);
    if (logsQ.data) setLogs(logsQ.data as Log[]);
    if (kpiQ.data) {
      const k: KPI = { smsSent: 0, smsDelivered: 0, emailSent: 0, emailDelivered: 0, failed: 0, fallbacks: 0 };
      for (const r of kpiQ.data as any[]) {
        if (r.channel === "sms" && r.delivery_status === "sent") k.smsSent++;
        if (r.channel === "sms" && r.delivery_status === "delivered") k.smsDelivered++;
        if (r.channel === "email" && r.delivery_status === "sent") k.emailSent++;
        if (r.channel === "email" && r.delivery_status === "delivered") k.emailDelivered++;
        if (["failed", "undelivered"].includes(r.delivery_status)) k.failed++;
        if (r.fallback_triggered) k.fallbacks++;
      }
      setKpi(k);
    }
    setLoading(false);
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

  const runTest = async () => {
    if (!testPhone && !testEmail) { toast.error("Téléphone ou courriel requis"); return; }
    setTestSending(true);
    const { data, error } = await supabase.functions.invoke("contact-router", {
      body: {
        contact: { phone: testPhone || undefined, email: testEmail || undefined, sms_consent: true, email_consent: true, first_name: "Test" },
        template_key: "router-smoke-test",
        sms_body: "UNPRO — test de routage SMS. Répondez STOP pour vous retirer.",
        email_subject: "UNPRO — test de routage",
        idempotency_key: `smoke-${Date.now()}`,
      },
    });
    setTestSending(false);
    if (error) toast.error(error.message);
    else toast.success(`Canal utilisé : ${(data as any)?.channel_used ?? "—"}${(data as any)?.fallback_scheduled ? " · fallback courriel planifié" : ""}`);
    load();
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Routage des communications</h1>
            <p className="mt-2 text-sm text-white/60">SMS d'abord si mobile, courriel en relais — moteur unique, logs en temps réel.</p>
          </div>
          <Button variant="ghost" onClick={load} className="gap-2 text-white/70 hover:text-white">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-6">
          <KpiCard icon={<MessageSquare className="h-4 w-4" />} label="SMS envoyés (24h)" value={kpi.smsSent} />
          <KpiCard icon={<Zap className="h-4 w-4" />} label="SMS livrés" value={kpi.smsDelivered} accent="emerald" />
          <KpiCard icon={<Mail className="h-4 w-4" />} label="Courriels envoyés" value={kpi.emailSent} />
          <KpiCard icon={<Mail className="h-4 w-4" />} label="Courriels livrés" value={kpi.emailDelivered} accent="emerald" />
          <KpiCard icon={<Activity className="h-4 w-4" />} label="Échecs" value={kpi.failed} accent="rose" />
          <KpiCard icon={<RefreshCw className="h-4 w-4" />} label="Relais déclenchés" value={kpi.fallbacks} accent="cyan" />
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
            {rules.length === 0 && !loading && <p className="text-sm text-white/40">Aucune règle.</p>}
          </div>
        </Glass>

        {/* Smoke test */}
        <Glass className="mb-8 p-6">
          <h2 className="mb-1 text-lg font-medium">Test de routage</h2>
          <p className="mb-4 text-xs text-white/50">Saisissez un téléphone et/ou un courriel — le moteur choisit le bon canal automatiquement.</p>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input placeholder="+15145551234" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="border-white/10 bg-white/[0.03]" />
            <Input placeholder="test@exemple.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="border-white/10 bg-white/[0.03]" />
            <Button onClick={runTest} disabled={testSending} className="rounded-2xl bg-cyan-500 px-6 text-[#050816] hover:bg-cyan-400">
              {testSending ? "Envoi…" : "Tester le routage"}
            </Button>
          </div>
        </Glass>

        {/* Live feed */}
        <Glass className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Activité en direct</h2>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <span className="mr-2 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> realtime
            </Badge>
          </div>
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm">
                {l.channel === "sms" ? <Phone className="h-4 w-4 text-cyan-300" /> : <Mail className="h-4 w-4 text-white/60" />}
                <span className="text-white/40 text-xs w-24 shrink-0">{new Date(l.created_at).toLocaleTimeString("fr-CA")}</span>
                <span className="font-mono text-xs text-white/70 w-44 truncate">{l.template_key || "—"}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusTone[l.delivery_status] ?? "bg-white/5 text-white/60"}`}>{l.delivery_status}</span>
                {l.fallback_triggered && <Badge variant="outline" className="border-cyan-400/30 bg-cyan-500/10 text-[10px] text-cyan-300">fallback</Badge>}
                <span className="ml-auto truncate text-xs text-white/40">{l.provider || "—"}</span>
                {l.error_message && <span className="max-w-[300px] truncate text-xs text-rose-300">{l.error_message}</span>}
              </div>
            ))}
            {logs.length === 0 && !loading && <p className="text-sm text-white/40">Aucun envoi récent.</p>}
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

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: "emerald" | "rose" | "cyan" }) {
  const tone = accent === "emerald" ? "text-emerald-300" : accent === "rose" ? "text-rose-300" : accent === "cyan" ? "text-cyan-300" : "text-white";
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-2 text-xs text-white/50">{icon}<span>{label}</span></div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${tone}`}>{value}</div>
    </Glass>
  );
}
