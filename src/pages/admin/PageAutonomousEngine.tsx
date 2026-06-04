/**
 * UNPRO — /admin/autonomous-engine
 * Cockpit du moteur d'activation autonome.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, AlertTriangle, Bot, CheckCircle2, Radar, Send, Sparkles, Target, Zap } from "lucide-react";

const AGENTS = [
  { name: "scout-leads", label: "Scout", fn: "agent-scout-leads", icon: Radar, desc: "Découvre les leads par cité × métier" },
  { name: "enrich-leads", label: "Enrichment", fn: "agent-enrich-leads", icon: Sparkles, desc: "Enrichit website, reviews, AIPP" },
  { name: "ai-visibility", label: "AI Visibility", fn: "agent-ai-visibility", icon: Bot, desc: "Score IA + insight personnalisé" },
  { name: "generate-message", label: "Messaging", fn: "agent-generate-message", icon: Zap, desc: "Génère SMS via Gemini" },
  { name: "send-outreach", label: "Send", fn: "agent-send-outreach", icon: Send, desc: "Envoi SMS/Email avec quotas" },
  { name: "activation-dispatch", label: "Activation", fn: "agent-activation-dispatch", icon: Target, desc: "Plan + Stripe link auto" },
] as const;

const REASON_LABELS: Record<string, string> = {
  missing_secret: "Secret provider manquant",
  invalid_phone: "Numéro invalide",
  provider_rejected: "Rejeté par le provider",
  quota_exceeded: "Quota journalier atteint",
  no_contact: "Aucun contact (ni tél, ni courriel)",
  opt_out: "Désinscrit (STOP)",
  cooldown: "Cooldown actif",
  lead_not_found: "Lead introuvable",
};

function deriveSendStatus(output: any): "ok" | "warning" | "failed" | "idle" {
  if (!output) return "idle";
  const sent = output.sent ?? 0, failed = output.failed ?? 0, queue = output.queue ?? 0;
  if (failed > 0 && sent === 0) return "failed";
  if (queue > 0 && sent === 0) return "warning";
  if (sent > 0) return "ok";
  return "idle";
}

export default function PageAutonomousEngine() {
  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const runs = useQuery({
    queryKey: ["agent-runs"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_runs" as any).select("*").order("started_at", { ascending: false }).limit(80);
      return (data ?? []) as any[];
    },
    refetchInterval: 8000,
  });

  const quotas = useQuery({
    queryKey: ["activation-quotas-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("activation_quotas" as any).select("*").eq("period_date", today).eq("scope", "global");
      return (data ?? []) as any[];
    },
    refetchInterval: 10000,
  });

  const leadsKpi = useQuery({
    queryKey: ["leads-kpi"],
    queryFn: async () => {
      const { count: total } = await supabase.from("contractor_leads").select("*", { count: "exact", head: true });
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count: today } = await supabase.from("contractor_leads").select("*", { count: "exact", head: true }).gte("created_at", since);
      const { count: scored } = await supabase.from("contractor_leads").select("*", { count: "exact", head: true }).eq("score_status", "scored");
      const { count: contacted } = await supabase.from("contractor_leads").select("*", { count: "exact", head: true }).eq("outreach_status", "contacted");
      return { total: total ?? 0, today: today ?? 0, scored: scored ?? 0, contacted: contacted ?? 0 };
    },
    refetchInterval: 15000,
  });

  const secrets = useQuery({
    queryKey: ["check-outreach-secrets"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("check-outreach-secrets", { body: {} });
      return data as Record<string, boolean>;
    },
    refetchInterval: 60000,
  });

  const deliveries = useQuery({
    queryKey: ["outreach-delivery-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("outreach_delivery_logs" as any).select("*").order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as any[];
    },
    refetchInterval: 10000,
  });

  const diagnostics = useQuery({
    queryKey: ["outreach-diagnostics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { data } = await supabase.from("outreach_delivery_logs" as any).select("status, error_code").gte("created_at", since);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        if (r.status === "sent") return;
        const k = r.error_code || r.status;
        counts[k] = (counts[k] ?? 0) + 1;
      });
      return counts;
    },
    refetchInterval: 15000,
  });

  const triggerAgent = async (fn: string, label: string) => {
    toast.loading(`${label}…`, { id: fn });
    const { data, error } = await supabase.functions.invoke(fn, { body: { triggered_by: "manual_cockpit", limit: 1 } });
    if (error) toast.error(`${label}: ${error.message}`, { id: fn });
    else toast.success(`${label}: ${JSON.stringify(data?.output ?? data)}`, { id: fn, duration: 8000 });
    runs.refetch(); deliveries.refetch(); diagnostics.refetch();
  };

  const runTestSend = async () => {
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("agent-send-test", {
      body: { channel: "sms", phone: testPhone, body: "Test UNPRO ✅ — l'envoi SMS fonctionne." },
    });
    setTestResult(error ? { error: error.message } : data);
  };

  const lastRunByAgent = (name: string) => runs.data?.find(r => r.agent_name === name);
  const smsReady = secrets.data?.sms_ready;
  const emailReady = secrets.data?.email_ready;

  return (
    <div className="min-h-screen bg-[#050816] text-white p-4 sm:p-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Autonomous Activation Engine</h1>
          <p className="text-white/60 text-sm mt-1">Scraping → score IA → envoi → activation. Aucun clic humain requis.</p>
        </div>
        <Button variant="outline" onClick={() => { runs.refetch(); quotas.refetch(); leadsKpi.refetch(); deliveries.refetch(); diagnostics.refetch(); secrets.refetch(); }}>Refresh</Button>
      </header>

      {/* Secrets health */}
      <Card className="bg-white/[0.04] border-white/10 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm font-medium uppercase tracking-wider text-white/60">Secrets providers</div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className={smsReady ? "border-emerald-400/40 text-emerald-300" : "border-red-400/50 text-red-300"}>
              {smsReady ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              SMS (Twilio) {smsReady ? "OK" : "MANQUANT"}
            </Badge>
            <Badge variant="outline" className={emailReady ? "border-emerald-400/40 text-emerald-300" : "border-red-400/50 text-red-300"}>
              {emailReady ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              Email (Resend) {emailReady ? "OK" : "MANQUANT"}
            </Badge>
          </div>
        </div>
        {!smsReady && (
          <div className="mt-3 text-xs text-red-300/90">
            Manquant: {Object.entries(secrets.data ?? {}).filter(([k, v]) => k.startsWith("twilio") && !v).map(([k]) => k.toUpperCase()).join(", ") || "—"}
          </div>
        )}
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Leads totaux", value: leadsKpi.data?.total ?? "—" },
          { label: "Découverts 24h", value: leadsKpi.data?.today ?? "—" },
          { label: "Scorés IA", value: leadsKpi.data?.scored ?? "—" },
          { label: "Contactés", value: leadsKpi.data?.contacted ?? "—" },
        ].map(k => (
          <Card key={k.label} className="bg-white/[0.04] border-white/10 backdrop-blur-xl p-4">
            <div className="text-xs uppercase tracking-wider text-white/50">{k.label}</div>
            <div className="text-3xl font-semibold mt-2">{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Pourquoi rien n'a été envoyé */}
      <Card className="bg-white/[0.04] border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Pourquoi rien n'a été envoyé ? (24h)</h2>
          <Badge variant="outline" className="border-white/20 text-white/60">
            {Object.values(diagnostics.data ?? {}).reduce((a: any, b: any) => a + b, 0)} blocages
          </Badge>
        </div>
        {Object.keys(diagnostics.data ?? {}).length === 0 ? (
          <div className="text-sm text-white/50">Aucun blocage détecté.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(diagnostics.data ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2 text-sm">
                <span className="text-white/70">{REASON_LABELS[k] ?? k}</span>
                <span className="font-semibold text-red-300">{v as number}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Test SMS */}
      <Card className="bg-white/[0.04] border-white/10 p-4">
        <h2 className="text-lg font-medium mb-3">Test SMS</h2>
        <div className="flex gap-2 flex-wrap">
          <Input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+15145551234 ou 514 555 1234" className="bg-black/30 border-white/10 max-w-xs" />
          <Button onClick={runTestSend} disabled={!testPhone}>Envoyer SMS test</Button>
        </div>
        {testResult && (
          <pre className="mt-3 text-[11px] bg-black/40 p-3 rounded overflow-auto max-h-60 text-white/80">{JSON.stringify(testResult, null, 2)}</pre>
        )}
      </Card>

      {/* Quotas */}
      <section>
        <h2 className="text-lg font-medium mb-3">Quotas du jour</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {["sms", "email", "activation"].map(ch => {
            const q = quotas.data?.find(x => x.channel === ch);
            const used = q?.used_count ?? 0; const limit = q?.limit_count ?? (ch === "sms" ? 50 : ch === "email" ? 25 : 5);
            const pct = Math.min(100, Math.round((used / limit) * 100));
            return (
              <Card key={ch} className="bg-white/[0.04] border-white/10 p-4">
                <div className="flex justify-between text-sm"><span className="uppercase tracking-wider text-white/60">{ch}</span><span>{used}/{limit}</span></div>
                <div className="h-2 mt-3 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full ${pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${pct}%` }} />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Agents */}
      <section>
        <h2 className="text-lg font-medium mb-3">Agents</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AGENTS.map(a => {
            const Icon = a.icon; const last = lastRunByAgent(a.name);
            let status: string = last?.status ?? "idle";
            if (a.name === "send-outreach") status = deriveSendStatus(last?.output);
            const cls = status === "ok" ? "border-emerald-400/40 text-emerald-300"
              : status === "error" || status === "failed" ? "border-red-400/40 text-red-300"
              : status === "warning" ? "border-amber-400/40 text-amber-300"
              : status === "running" ? "border-blue-400/40 text-blue-300"
              : "border-white/20 text-white/50";
            return (
              <Card key={a.name} className="bg-white/[0.04] border-white/10 backdrop-blur-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-blue-400" /><span className="font-medium">{a.label}</span></div>
                  <Badge variant="outline" className={cls}>{status}</Badge>
                </div>
                <p className="text-xs text-white/55">{a.desc}</p>
                <div className="text-[11px] text-white/40">
                  {last ? `Dernier: ${new Date(last.started_at).toLocaleTimeString("fr-CA")} · ${last.duration_ms ?? "—"}ms` : "Jamais exécuté"}
                </div>
                {last?.output && (
                  <pre className="text-[10px] bg-black/40 p-2 rounded overflow-auto max-h-24 text-white/70">{JSON.stringify(last.output, null, 0)}</pre>
                )}
                <Button size="sm" className="w-full" onClick={() => triggerAgent(a.fn, a.label)}>
                  <Activity className="h-3 w-3 mr-1" /> Exécuter (limit 1)
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent deliveries */}
      <section>
        <h2 className="text-lg font-medium mb-3">Derniers envois (outreach_delivery_logs)</h2>
        <Card className="bg-white/[0.04] border-white/10 overflow-hidden">
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-white/50 uppercase tracking-wider sticky top-0 bg-[#050816]">
                <tr>
                  <th className="text-left p-3">Heure</th>
                  <th className="text-left p-3">Canal</th>
                  <th className="text-left p-3">Destinataire</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Provider ID / Erreur</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.data?.map(d => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="p-3 text-white/50">{new Date(d.created_at).toLocaleTimeString("fr-CA")}</td>
                    <td className="p-3">{d.channel}</td>
                    <td className="p-3 text-white/70">{d.recipient_normalized || d.recipient_raw || "—"}</td>
                    <td className="p-3">
                      <span className={d.status === "sent" ? "text-emerald-300" : d.status === "blocked" ? "text-amber-300" : "text-red-300"}>{d.status}</span>
                    </td>
                    <td className="p-3 text-white/60">{d.error_code ?? "—"}</td>
                    <td className="p-3 text-white/60 max-w-md truncate">{d.provider_message_id ?? d.error_message ?? "—"}</td>
                  </tr>
                ))}
                {(deliveries.data?.length ?? 0) === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-white/40">Aucun log d'envoi pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Activity log */}
      <section>
        <h2 className="text-lg font-medium mb-3">Activité agents</h2>
        <Card className="bg-white/[0.04] border-white/10 overflow-hidden">
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-white/50 uppercase tracking-wider sticky top-0 bg-[#050816]">
                <tr><th className="text-left p-3">Agent</th><th className="text-left p-3">Statut</th><th className="text-left p-3">Démarré</th><th className="text-left p-3">Durée</th><th className="text-left p-3">Output / Erreur</th></tr>
              </thead>
              <tbody>
                {runs.data?.map(r => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="p-3 font-medium">{r.agent_name}</td>
                    <td className="p-3">{r.status}</td>
                    <td className="p-3 text-white/60">{new Date(r.started_at).toLocaleString("fr-CA")}</td>
                    <td className="p-3 text-white/60">{r.duration_ms ?? "—"}ms</td>
                    <td className="p-3 text-white/70 text-xs max-w-md truncate">{r.error ?? JSON.stringify(r.output ?? {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
