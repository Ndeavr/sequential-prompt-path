import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Diag = {
  ok: boolean;
  sender?: {
    env_value: string;
    canonical: string;
    blocked_us_number: string;
    env_matches_canonical: boolean;
    status_callback_url: string;
    inbound_webhook_url: string;
  };
  twilio_number?: {
    available: boolean;
    reason?: string;
    phone_number?: string;
    country?: string | null;
    sms_enabled?: boolean;
    voice_enabled?: boolean;
    sms_url?: string;
    status_callback?: string;
  };
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
    clicked_at: string | null;
    created_at: string;
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
        toast.success(`SMS envoyé — sid=${r.result?.twilio_sid ?? "—"}`);
        setTimeout(load, 2500);
      } else {
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

      {data && (
        <>
          {/* Sender config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`p-3 rounded border ${senderOk ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/50 bg-red-500/10"}`}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Sender configuré</div>
              <div className="font-mono text-sm">{data.sender?.env_value}</div>
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
                  <div className="text-xs">SMS: {data.twilio_number.sms_enabled ? "✅" : "❌"} · Voice: {data.twilio_number.voice_enabled ? "✅" : "❌"}</div>
                  {data.twilio_number.status_callback?.includes("demo.twilio.com") && (
                    <div className="text-xs text-red-300">⚠️ Webhook = demo Twilio. Remplace par {data.sender?.status_callback_url}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-amber-300">Indisponible · {data.twilio_number?.reason}</div>
              )}
            </div>
          </div>

          {/* Webhook URLs */}
          <div className="text-xs space-y-1 p-3 rounded border border-white/10 bg-white/[0.02]">
            <div className="text-muted-foreground uppercase tracking-wider">URLs à coller dans Twilio Console</div>
            <div><span className="text-muted-foreground">Inbound:</span> <code className="break-all">{data.sender?.inbound_webhook_url}</code></div>
            <div><span className="text-muted-foreground">Status callback:</span> <code className="break-all">{data.sender?.status_callback_url}</code></div>
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
              <Button onClick={runSmoke} disabled={sending || !senderOk}>
                {sending ? "Envoi…" : "Envoyer test SMS"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Flow attendu: queued → sent → delivered → clicked. Si pas delivered dans 2 min, l'erreur Twilio exacte apparaît ci-dessous.
            </p>
          </div>

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
