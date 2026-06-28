import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import TwilioE2EAuditPanel from "./TwilioE2EAuditPanel";

type Diag = {
  ok: boolean;
  sender?: {
    account_sid_present?: boolean;
    account_sid_masked?: string;
    auth_token_present?: boolean;
    env_value: string;
    legacy_phone_number_env?: string;
    canonical: string;
    blocked_us_number: string;
    env_matches_canonical: boolean;
    status_callback_url: string;
    canonical_status_callback_url?: string;
    inbound_webhook_url: string;
  };
  account?: { ok: boolean; status?: string | null; type?: string | null; friendly_name?: string | null; error_message?: string | null; http_status?: number | null };
  twilio_number?: {
    available: boolean;
    reason?: string;
    friendly_name?: string | null;
    phone_number?: string;
    country?: string | null;
    sms_enabled?: boolean;
    mms_enabled?: boolean;
    voice_enabled?: boolean;
    sms_url?: string;
    sms_method?: string;
    status_callback?: string;
    error_message?: string | null;
  };
  messaging_service?: { configured: boolean; ok?: boolean; sid?: string; friendly_name?: string | null; sender_attached?: boolean; sender_count?: number; status_callback?: string | null; inbound_request_url?: string | null; error_message?: string | null; note?: string };
  verify_service?: { configured: boolean; ok?: boolean; sid?: string; friendly_name?: string | null; error_message?: string | null };
  edge_callbacks?: Record<string, { ok: boolean; status: number; error?: string }>;
  diagnosis?: { status: "blocked" | "warning" | "green"; root_cause: string; blockers: string[]; warnings: string[] };
  db_totals?: { total: number; api_sent: number; delivered: number; failed: number; webhooks: number; error_30006: number; invalid_phone: number };
  twilio_messages?: { ok: boolean; http_status?: number; error_message?: string; messages: Array<any> };
  status_breakdown?: Record<string, number>;
  recent_messages?: Array<{
    id: string;
    twilio_sid: string | null;
    status: string;
    from_number: string | null;
    normalized_phone: string | null;
    template_key: string | null;
    campaign_id: string | null;
    contractor_id: string | null;
    message_preview: string | null;
    error_code: string | null;
    error_message: string | null;
    sent_at: string | null;
    delivered_at: string | null;
    failed_at: string | null;
    webhook_received_at?: string | null;
    clicked_at: string | null;
    created_at: string;
    provider_response?: any;
    status_callback_url?: string | null;
    twilio_status_url?: string | null;
    metadata: any;
  }>;
  error?: string;
};

const fmt = (v: string | null | undefined) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("fr-CA"); } catch { return v; }
};

const STATUS_TONE: Record<string, string> = {
  queued: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  sending: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  sent: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  delivered: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  clicked: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  failed: "bg-red-500/20 text-red-300 border-red-500/40",
  undelivered: "bg-red-500/20 text-red-300 border-red-500/40",
  deferred_window: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

export default function TwilioDiagnosticPanel() {
  const [data, setData] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);
  const [lastTest, setLastTest] = useState<any>(null);
  const [msvc, setMsvc] = useState<any>(null);
  const [msvcLoading, setMsvcLoading] = useState(false);

  const revealMessagingService = useCallback(async () => {
    setMsvcLoading(true);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("twilio-messaging-service-info", { method: "POST" });
      if (err) throw err;
      setMsvc(res);
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setMsvcLoading(false);
    }
  }, []);


  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("twilio-diagnostics", { method: "GET" });
      if (err) throw err;
      setData(res as Diag);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSmoke = useCallback(async () => {
    if (!testTo.trim()) { toast.error("Numéro requis"); return; }
    setSending(true);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("twilio-diagnostics", {
        method: "POST",
        body: { to: testTo.trim() },
      });
      if (err) throw err;
      const r: any = res;
      if (r?.ok) {
        toast.success(`SMS accepté par Twilio — sid=${r.result?.twilio_sid ?? "—"}`);
        setLastTest(r);
        setTimeout(load, 2500);
      } else {
        setLastTest(r);
        toast.error(`Échec: ${r?.result?.error_code || ""} ${r?.result?.error_message || r?.error || "unknown"}`);
        load();
      }
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setSending(false);
    }
  }, [testTo, load]);

  const senderOk = data?.sender?.env_matches_canonical;
  const numOk = data?.twilio_number?.available && data?.twilio_number?.sms_enabled;
  const blocked = data?.diagnosis?.status === "blocked";

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold">Twilio — diagnostic SMS</h3>
          <p className="text-xs text-muted-foreground">
            Sender canonique requis: <code>+14503286776</code> (QC). Bloqué: <code>+15745405938</code> (US, A2P requis).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Chargement…" : "Rafraîchir"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-400 border border-red-500/40 bg-red-500/10 rounded p-3">
          {error}
        </div>
      )}

      <LiveAuthAudit />

      <div className="p-3 rounded border border-violet-500/30 bg-violet-500/5 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Messaging Service — révéler SID + webhook configuré</div>
            <p className="text-xs text-muted-foreground">Lit <code>TWILIO_MESSAGING_SERVICE_SID</code> et appelle l'API Twilio Messaging pour retourner le SID, le nom, l'URL inbound réellement configurée, et les numéros attachés.</p>
          </div>
          <Button size="sm" variant="outline" onClick={revealMessagingService} disabled={msvcLoading}>
            {msvcLoading ? "Chargement…" : "Reveal Messaging Service"}
          </Button>
        </div>
        {msvc && (
          <div className="text-xs space-y-1">
            <div><span className="text-muted-foreground">SID:</span> <code className="font-mono">{msvc.messaging_service_sid || "—"}</code></div>
            <div><span className="text-muted-foreground">Nom:</span> {msvc.friendly_name || "—"}</div>
            <div><span className="text-muted-foreground">Inbound configuré:</span> <code className="break-all">{msvc.inbound_request_url || "—"}</code> {msvc.matches_expected_inbound ? "✅" : "❌"}</div>
            <div><span className="text-muted-foreground">Inbound attendu:</span> <code className="break-all">{msvc.expected_inbound_url}</code></div>
            <div><span className="text-muted-foreground">Status callback configuré:</span> <code className="break-all">{msvc.status_callback || "—"}</code> {msvc.matches_expected_status_callback ? "✅" : "❌"}</div>
            <div><span className="text-muted-foreground">Status callback attendu:</span> <code className="break-all">{msvc.expected_status_callback}</code></div>
            <div><span className="text-muted-foreground">Numéro canonique attaché ({msvc.canonical_from}):</span> {msvc.canonical_attached ? "✅" : "❌"}</div>
            <div><span className="text-muted-foreground">Numéros attachés:</span> {(msvc.phone_numbers || []).map((p: any) => p.phone_number).join(", ") || "—"}</div>
            <div className="pt-1">
              <a className="text-violet-300 underline" href={msvc.twilio_console_url} target="_blank" rel="noreferrer">→ Configurer dans Twilio Console (Integration)</a>
            </div>
            {msvc.error && <div className="text-red-300">{msvc.error}</div>}
          </div>
        )}
      </div>

      <TwilioE2EAuditPanel />



      {data && (
        <>

          {/* Sender config */}
          {data.diagnosis && (
            <div className={`p-3 rounded border ${blocked ? "border-red-500/50 bg-red-500/10" : data.diagnosis.status === "warning" ? "border-amber-500/40 bg-amber-500/10" : "border-emerald-500/40 bg-emerald-500/5"}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-semibold">Root cause — Twilio SMS production</div>
                <Badge variant="outline" className={blocked ? "bg-red-500/20 text-red-300 border-red-500/40" : data.diagnosis.status === "warning" ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"}>
                  {data.diagnosis.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm mt-1">{data.diagnosis.root_cause}</p>
              {data.diagnosis.blockers.length > 0 && (
                <ul className="text-xs text-red-200 list-disc ml-5 mt-2 space-y-1">
                  {data.diagnosis.blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
              {data.diagnosis.warnings.length > 0 && (
                <ul className="text-xs text-amber-200 list-disc ml-5 mt-2 space-y-1">
                  {data.diagnosis.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div className="p-2 rounded bg-white/[0.03] border border-white/10"><div className="text-muted-foreground">API sent</div><div className="text-lg font-semibold">{data.db_totals?.api_sent ?? 0}</div></div>
            <div className="p-2 rounded bg-white/[0.03] border border-white/10"><div className="text-muted-foreground">Delivered</div><div className="text-lg font-semibold text-emerald-300">{data.db_totals?.delivered ?? 0}</div></div>
            <div className="p-2 rounded bg-white/[0.03] border border-white/10"><div className="text-muted-foreground">Webhooks</div><div className="text-lg font-semibold">{data.db_totals?.webhooks ?? 0}</div></div>
            <div className="p-2 rounded bg-white/[0.03] border border-white/10"><div className="text-muted-foreground">Failed</div><div className="text-lg font-semibold text-red-300">{data.db_totals?.failed ?? 0}</div></div>
            <div className="p-2 rounded bg-white/[0.03] border border-white/10"><div className="text-muted-foreground">30006</div><div className="text-lg font-semibold text-amber-300">{data.db_totals?.error_30006 ?? 0}</div></div>
            <div className="p-2 rounded bg-white/[0.03] border border-white/10"><div className="text-muted-foreground">Invalid</div><div className="text-lg font-semibold">{data.db_totals?.invalid_phone ?? 0}</div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`p-3 rounded border ${senderOk ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/50 bg-red-500/10"}`}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Sender configuré</div>
              <div className="font-mono text-sm">{data.sender?.env_value}</div>
              <div className="text-xs text-muted-foreground mt-1">Account SID: {data.sender?.account_sid_masked} · Auth token: {data.sender?.auth_token_present ? "présent" : "manquant"}</div>
              <div className="text-xs text-muted-foreground">TWILIO_PHONE_NUMBER legacy: {data.sender?.legacy_phone_number_env}</div>
              {!senderOk && (
                <div className="text-xs text-red-300 mt-1">
                  ⚠️ Mauvais sender. Attendu {data.sender?.canonical}. SMS bloqués jusqu'à correction.
                </div>
              )}
            </div>
            <div className={`p-3 rounded border ${numOk ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Numéro Twilio (live)</div>
              {data.twilio_number?.available ? (
                <div className="text-sm space-y-0.5">
                  <div className="font-mono">{data.twilio_number.phone_number} · {data.twilio_number.country}</div>
                  <div className="text-xs">SMS: {data.twilio_number.sms_enabled ? "✅" : "❌"} · MMS: {data.twilio_number.mms_enabled ? "✅" : "❌"} · Voice: {data.twilio_number.voice_enabled ? "✅" : "❌"}</div>
                  <div className="text-xs text-muted-foreground break-all">Incoming SMS URL: {data.twilio_number.sms_url || "—"}</div>
                  {data.twilio_number.status_callback?.includes("demo.twilio.com") && (
                    <div className="text-xs text-red-300">⚠️ Webhook = demo Twilio. Remplace par {data.sender?.status_callback_url}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-amber-300">Indisponible · {data.twilio_number?.reason} {data.twilio_number?.error_message ? `· ${data.twilio_number.error_message}` : ""}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded border border-white/10 bg-white/[0.02]">
              <div className="uppercase tracking-wider text-muted-foreground mb-1">Account</div>
              <div>Status: {data.account?.ok ? `✅ ${data.account.status || "ok"}` : `❌ ${data.account?.error_message || "failed"}`}</div>
              <div>Type: {data.account?.type || "—"}</div>
              <div>Name: {data.account?.friendly_name || "—"}</div>
            </div>
            <div className="p-3 rounded border border-white/10 bg-white/[0.02]">
              <div className="uppercase tracking-wider text-muted-foreground mb-1">Messaging Service</div>
              <div>{data.messaging_service?.configured ? (data.messaging_service.ok ? "✅ Configuré" : "❌ Erreur") : "Non utilisé"}</div>
              <div>SID: {data.messaging_service?.sid || "—"}</div>
              <div>Sender attaché: {data.messaging_service?.sender_attached ? "✅" : data.messaging_service?.configured ? "❌" : "—"}</div>
              {data.messaging_service?.error_message && <div className="text-red-300">{data.messaging_service.error_message}</div>}
            </div>
            <div className="p-3 rounded border border-white/10 bg-white/[0.02]">
              <div className="uppercase tracking-wider text-muted-foreground mb-1">Verify Service</div>
              <div>{data.verify_service?.configured ? (data.verify_service.ok ? "✅ Configuré" : "❌ Erreur") : "Non configuré"}</div>
              <div>SID: {data.verify_service?.sid || "—"}</div>
              {data.verify_service?.error_message && <div className="text-red-300">{data.verify_service.error_message}</div>}
            </div>
          </div>

          {/* Webhook URLs */}
          <div className="text-xs space-y-1 p-3 rounded border border-white/10 bg-white/[0.02]">
            <div className="text-muted-foreground uppercase tracking-wider">URLs à coller dans Twilio Console</div>
            <div><span className="text-muted-foreground">Inbound:</span> <code className="break-all">{data.sender?.inbound_webhook_url}</code></div>
            <div><span className="text-muted-foreground">Status callback:</span> <code className="break-all">{data.sender?.status_callback_url}</code></div>
            <div className="pt-1 text-muted-foreground">Reachability: inbound {data.edge_callbacks?.inbound?.ok ? "✅" : "❌"} · status {data.edge_callbacks?.status?.ok ? "✅" : "❌"} · v2 {data.edge_callbacks?.status_v2?.ok ? "✅" : "❌"}</div>
          </div>

          {/* Smoke test */}
          <div className="p-3 rounded border border-blue-500/30 bg-blue-500/5 space-y-2">
            <div className="text-sm font-medium">Smoke test SMS</div>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="+15145551234"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={runSmoke} disabled={sending || !senderOk || blocked}>
                {sending ? "Envoi…" : "Envoyer test SMS"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Flow attendu: queued → sent → delivered → clicked. Si pas delivered dans 2 min, l'erreur Twilio exacte apparaît ci-dessous.
            </p>
            {lastTest && (
              <div className="text-xs rounded bg-black/20 border border-white/10 p-2 space-y-1">
                <div>Message SID: <code>{lastTest.result?.twilio_sid || "—"}</code></div>
                <div>API status: <code>{lastTest.live_status?.status || lastTest.result?.status || "—"}</code> · error: <code>{lastTest.live_status?.error_code || lastTest.result?.error_code || "—"}</code></div>
                <div>Tracked CTA: <code className="break-all">{lastTest.tracking_url || "—"}</code></div>
              </div>
            )}
          </div>

          {data.twilio_messages?.messages?.length ? (
            <details className="text-xs p-3 rounded border border-white/10 bg-white/[0.02]">
              <summary className="cursor-pointer font-medium">Twilio live Messaging Logs — derniers 25</summary>
              <div className="overflow-x-auto mt-2">
                <table className="w-full">
                  <thead className="text-left text-muted-foreground"><tr><th className="pr-2">SID</th><th className="pr-2">To</th><th className="pr-2">Status</th><th className="pr-2">Error</th><th className="pr-2">Sent</th></tr></thead>
                  <tbody>{data.twilio_messages.messages.map((m: any) => (
                    <tr key={m.sid} className="border-t border-white/5"><td className="py-1 pr-2 font-mono">{m.sid?.slice(0, 14)}</td><td className="pr-2 font-mono">{m.to}</td><td className="pr-2">{m.status}</td><td className="pr-2 text-red-300">{m.error_code || "—"} {m.error_message || ""}</td><td className="pr-2 whitespace-nowrap">{m.date_sent || m.date_created}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          ) : data.twilio_messages && !data.twilio_messages.ok ? (
            <div className="text-xs text-red-300 p-3 rounded border border-red-500/30 bg-red-500/10">Twilio Messaging Logs indisponibles: {data.twilio_messages.error_message}</div>
          ) : null}

          {/* Status breakdown */}
          {data.status_breakdown && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.status_breakdown).map(([s, n]) => (
                <Badge key={s} variant="outline" className={STATUS_TONE[s] || ""}>
                  {s}: {n}
                </Badge>
              ))}
            </div>
          )}

          {/* Recent messages */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b border-white/10">
                <tr>
                  <th className="py-2 pr-2">Quand</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Vers</th>
                  <th className="py-2 pr-2">Template</th>
                  <th className="py-2 pr-2">SID</th>
                  <th className="py-2 pr-2">Sent</th>
                  <th className="py-2 pr-2">Delivered</th>
                  <th className="py-2 pr-2">Webhook</th>
                  <th className="py-2 pr-2">Clicked</th>
                  <th className="py-2 pr-2">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {(data.recent_messages ?? []).map((m) => (
                  <tr key={m.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-2 whitespace-nowrap">{fmt(m.created_at)}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className={STATUS_TONE[m.status] || ""}>{m.status}</Badge>
                    </td>
                    <td className="py-2 pr-2 font-mono">{m.normalized_phone || "—"}</td>
                    <td className="py-2 pr-2">{m.template_key || "—"}</td>
                    <td className="py-2 pr-2 font-mono text-[10px]">{m.twilio_sid?.slice(0, 12) || "—"}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">{fmt(m.sent_at)}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">{fmt(m.delivered_at)}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">{fmt(m.webhook_received_at)}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">{fmt(m.clicked_at)}</td>
                    <td className="py-2 pr-2 text-red-300">
                      {m.error_code ? <div className="font-mono">{m.error_code}</div> : null}
                      {m.error_message ? <div className="text-[10px] opacity-80">{m.error_message}</div> : null}
                    </td>
                  </tr>
                ))}
                {(!data.recent_messages || data.recent_messages.length === 0) && (
                  <tr><td colSpan={9} className="py-4 text-center text-muted-foreground">Aucun SMS récent.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function ProbeRow({ label, secret, probe }: { label: string; secret: string; probe: any }) {
  if (!probe || probe.skipped) {
    return (
      <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
        <span className="text-muted-foreground">{label} <code className="text-[10px]">{secret}</code></span>
        <span className="text-muted-foreground">— {probe?.reason || "non testé"}</span>
      </div>
    );
  }
  const ok = probe.ok || probe.exists_in_account === true;
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-white/5 gap-2">
      <span><span className={ok ? "text-emerald-400" : "text-red-400"}>{ok ? "✓" : "✗"}</span> {label} <code className="text-[10px] text-muted-foreground">{secret}</code></span>
      <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[60%] text-right">
        HTTP {probe.status}{probe.twilio_code ? ` · code ${probe.twilio_code}` : ""}{probe.twilio_message ? ` · ${probe.twilio_message}` : ""}{probe.exists_in_account === false ? " · introuvable dans le compte" : ""}
      </span>
    </div>
  );
}

function LiveAuthAudit() {
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-auth-audit", { method: "GET" });
      if (error) throw error;
      setAudit(data);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }, []);

  const verdict = audit?.verdict;
  const failing: string | null = verdict?.failing_secret ?? null;

  return (
    <div className="border border-white/10 rounded p-3 space-y-3 bg-black/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-semibold">Live Twilio auth audit (no cache)</div>
          <p className="text-xs text-muted-foreground">Appel direct authentifié à l'API Twilio. Identifie le secret défaillant.</p>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={busy}>
          {busy ? "Audit en cours…" : "Run Live Auth Audit"}
        </Button>
      </div>

      {err && <div className="text-xs text-red-400">{err}</div>}

      {audit && (
        <>
          <div className={`p-2 rounded text-sm border ${failing ? "border-red-500/50 bg-red-500/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"}`}>
            {failing ? (
              <>
                <div className="font-semibold">Secret défaillant : <code className="text-red-300">{failing}</code></div>
                <div className="text-xs mt-1 text-red-100/90">{verdict?.next_action}</div>
              </>
            ) : (
              <div className="font-semibold">✓ Tous les secrets Twilio sont valides ({verdict?.next_action})</div>
            )}
          </div>

          <div>
            <ProbeRow label="Account auth (SID + Token)" secret="TWILIO_AUTH_TOKEN" probe={audit.account} />
            <ProbeRow label="Phone number" secret="TWILIO_PHONE_NUMBER" probe={audit.phone_number} />
            <ProbeRow label="From number" secret="TWILIO_FROM_NUMBER" probe={audit.from_number} />
            <ProbeRow label="Messaging Service" secret="TWILIO_MESSAGING_SERVICE_SID" probe={audit.messaging_service} />
            <ProbeRow label="Verify Service" secret="TWILIO_VERIFY_SERVICE_SID" probe={audit.verify_service} />
            <ProbeRow label="Connector gateway" secret="TWILIO_API_KEY" probe={audit.connector_gateway} />
          </div>

          {failing === "TWILIO_AUTH_TOKEN" && (
            <a
              href="https://console.twilio.com/us1/account/keys-credentials/api-keys"
              target="_blank" rel="noreferrer"
              className="inline-block text-xs underline text-blue-300"
            >Ouvrir Twilio Console → Account → API keys & tokens</a>
          )}

          <details className="text-[10px]">
            <summary className="cursor-pointer text-muted-foreground">Raw audit JSON</summary>
            <pre className="mt-1 max-h-64 overflow-auto bg-black/40 p-2 rounded">{JSON.stringify(audit, null, 2)}</pre>
          </details>
        </>
      )}
    </div>
  );
}

