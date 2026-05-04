/**
 * UNPRO — Admin SMS Debug Panel
 * Recent OTP sends, failed Twilio sends, inbound replies, delivery status,
 * phone normalization tester, resend test button.
 * Admin-only (RLS gated). No secrets ever displayed.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Send, Phone, AlertTriangle, Inbox, CheckCircle2 } from "lucide-react";

type SmsRow = {
  id: string;
  message_sid: string | null;
  phone_number: string | null;
  direction: string | null;
  message_body: string | null;
  status: string | null;
  intent: string | null;
  purpose: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string | null;
};

type OtpRow = {
  id: string;
  phone: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
  ip: string | null;
  created_at: string;
};

function maskPhone(p: string | null): string {
  if (!p) return "—";
  if (p.length <= 4) return p;
  return p.slice(0, 4) + "•••" + p.slice(-2);
}

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (raw.startsWith("+") && /^\+\d{10,15}$/.test(raw)) return raw;
  return null;
}

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  queued: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  undelivered: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  received: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

export default function PageSmsDebug() {
  const [outbound, setOutbound] = useState<SmsRow[]>([]);
  const [inbound, setInbound] = useState<SmsRow[]>([]);
  const [failed, setFailed] = useState<SmsRow[]>([]);
  const [otps, setOtps] = useState<OtpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [oRes, iRes, fRes, otpRes] = await Promise.all([
      supabase.from("sms_messages").select("*")
        .eq("direction", "outbound").order("created_at", { ascending: false }).limit(50),
      supabase.from("sms_messages").select("*")
        .eq("direction", "inbound").order("created_at", { ascending: false }).limit(50),
      supabase.from("sms_messages").select("*")
        .in("status", ["failed", "undelivered"]).order("created_at", { ascending: false }).limit(25),
      supabase.from("otp_codes").select("id,phone,expires_at,attempts,consumed_at,ip,created_at")
        .order("created_at", { ascending: false }).limit(25),
    ]);
    console.log("[PageSmsDebug] load results", {
      outbound: { count: oRes.data?.length ?? 0, error: oRes.error },
      inbound: { count: iRes.data?.length ?? 0, error: iRes.error },
      failed: { count: fRes.data?.length ?? 0, error: fRes.error },
      otp: { count: otpRes.data?.length ?? 0, error: otpRes.error },
    });
    [oRes.error, iRes.error, fRes.error, otpRes.error].filter(Boolean).forEach((error) => {
      console.error("[PageSmsDebug] Supabase error", error);
    });
    setOutbound((oRes.data as SmsRow[]) || []);
    setInbound((iRes.data as SmsRow[]) || []);
    setFailed((fRes.data as SmsRow[]) || []);
    setOtps((otpRes.data as OtpRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const e164 = normalizePhone(testInput);

  const sendTest = async () => {
    if (!e164) { toast.error("Numéro invalide"); return; }
    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Test envoyé");
        setTimeout(load, 1500);
      } else {
        toast.error("Échec envoi");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">SMS Debug</h1>
            <p className="text-sm text-white/50">Twilio OTP · Inbound · Delivery status</p>
          </div>
          <Button onClick={load} variant="outline" size="sm" disabled={loading} className="gap-2">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </header>

        {/* Test tools */}
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="h-4 w-4 text-blue-400" />
            <h2 className="font-medium">Test d'envoi & normalisation</h2>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="(514) 555-1234"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="bg-black/40 border-white/10 max-w-xs"
            />
            <div className="text-xs text-white/60 font-mono">
              → {e164 ? <span className="text-emerald-400">{e164}</span> : <span className="text-rose-400">invalide</span>}
            </div>
            <Button onClick={sendTest} disabled={!e164 || sending} size="sm" className="gap-2 ml-auto">
              <Send className="h-3 w-3" /> {sending ? "Envoi…" : "Envoyer test"}
            </Button>
          </div>
        </Card>

        {/* Failed */}
        <Card className="p-4 bg-rose-500/5 border-rose-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h2 className="font-medium">Échecs Twilio ({failed.length})</h2>
          </div>
          <SmsTable rows={failed} empty="Aucun échec récent." />
        </Card>

        {/* OTP sends */}
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h2 className="font-medium">OTP récents ({otps.length})</h2>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead className="text-white/40">
                <tr><th className="text-left p-2">Phone</th><th className="text-left p-2">Créé</th><th className="text-left p-2">Expire</th><th className="text-left p-2">Tent.</th><th className="text-left p-2">État</th></tr>
              </thead>
              <tbody>
                {otps.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-white/40">Aucun OTP.</td></tr>}
                {otps.map((r) => {
                  const expired = new Date(r.expires_at) < new Date();
                  const state = r.consumed_at ? "consumed" : expired ? "expired" : "active";
                  return (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="p-2 font-mono">{maskPhone(r.phone)}</td>
                      <td className="p-2 text-white/60">{new Date(r.created_at).toLocaleTimeString("fr-CA")}</td>
                      <td className="p-2 text-white/60">{new Date(r.expires_at).toLocaleTimeString("fr-CA")}</td>
                      <td className="p-2">{r.attempts}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={
                          state === "consumed" ? "border-emerald-500/30 text-emerald-300" :
                          state === "expired" ? "border-slate-500/30 text-slate-300" :
                          "border-blue-500/30 text-blue-300"
                        }>{state}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Outbound */}
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Send className="h-4 w-4 text-blue-400" />
            <h2 className="font-medium">Sortants récents ({outbound.length})</h2>
          </div>
          <SmsTable rows={outbound} empty="Aucun envoi." />
        </Card>

        {/* Inbound */}
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="h-4 w-4 text-violet-400" />
            <h2 className="font-medium">Réponses entrantes ({inbound.length})</h2>
          </div>
          <SmsTable rows={inbound} empty="Aucune réponse." showIntent showBody />
        </Card>
      </div>
    </div>
  );
}

function SmsTable({ rows, empty, showIntent, showBody }: { rows: SmsRow[]; empty: string; showIntent?: boolean; showBody?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-white/40 py-4 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-xs">
        <thead className="text-white/40">
          <tr>
            <th className="text-left p-2">Phone</th>
            <th className="text-left p-2">Statut</th>
            {showIntent && <th className="text-left p-2">Intent</th>}
            {showBody && <th className="text-left p-2">Message</th>}
            <th className="text-left p-2">SID</th>
            <th className="text-left p-2">Créé</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/5">
              <td className="p-2 font-mono">{maskPhone(r.phone_number)}</td>
              <td className="p-2">
                <Badge variant="outline" className={STATUS_COLORS[r.status || ""] || "border-white/10 text-white/60"}>
                  {r.status || "—"}
                </Badge>
              </td>
              {showIntent && <td className="p-2 text-white/70">{r.intent || "—"}</td>}
              {showBody && <td className="p-2 text-white/70 max-w-xs truncate">{r.message_body || "—"}</td>}
              <td className="p-2 text-white/40 font-mono text-[10px]">{r.message_sid?.slice(-8) || "—"}</td>
              <td className="p-2 text-white/60">{new Date(r.created_at).toLocaleString("fr-CA")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
