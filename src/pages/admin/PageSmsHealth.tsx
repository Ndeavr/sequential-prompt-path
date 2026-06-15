import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ERROR_LABELS_FR: Record<string, string> = {
  "30003": "Téléphone hors-service ou éteint",
  "30004": "Message bloqué par l'opérateur",
  "30005": "Numéro inconnu ou inexistant",
  "30006": "Numéro fixe ou incompatible SMS",
  "30007": "Filtré par opérateur (carrier filtering)",
  "30008": "Erreur inconnue",
  "21610": "Numéro désabonné (STOP)",
  "21614": "Numéro 'To' invalide",
  "21408": "Permission région non activée",
  "21211": "Numéro de téléphone invalide",
  "config": "Configuration Twilio manquante",
  "network": "Erreur réseau",
  "unknown": "Cause non catégorisée",
};

type Health = { delivered: number; failed: number; undelivered: number; queued: number; invalid: number; total: number };
type Reason = { error_code: string; count: number };
type EventRow = {
  id: string; status: string; normalized_phone: string | null; message_type: string;
  error_code: string | null; error_message: string | null; created_at: string; twilio_sid: string | null;
};

export default function PageSmsHealth() {
  const [h24, setH24] = useState<Health | null>(null);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [recent, setRecent] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [a, b, c] = await Promise.all([
      supabase.from("v_sms_health_24h").select("*").maybeSingle(),
      supabase.from("v_sms_failure_reasons_7d").select("*").limit(10),
      supabase.from("sms_events_v2").select("id,status,normalized_phone,message_type,error_code,error_message,created_at,twilio_sid").order("created_at", { ascending: false }).limit(50),
    ]);
    if (a.data) setH24(a.data as Health);
    if (b.data) setReasons(b.data as Reason[]);
    if (c.data) setRecent(c.data as EventRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const successRate = h24 && h24.total > 0 ? Math.round((h24.delivered / h24.total) * 1000) / 10 : 0;

  return (
    <div className="admin-theme min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">SMS Health</h1>
          <p className="text-readable-secondary text-sm mt-1">Surveillance en temps réel de chaque SMS envoyé par UNPRO.</p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi label="Livrés (24h)" value={h24?.delivered ?? 0} tone="success" />
          <Kpi label="En cours" value={h24?.queued ?? 0} tone="info" />
          <Kpi label="Échecs" value={h24?.failed ?? 0} tone="danger" />
          <Kpi label="Non livrés" value={h24?.undelivered ?? 0} tone="warning" />
          <Kpi label="Bloqués / invalides" value={h24?.invalid ?? 0} tone="muted" />
          <Kpi label="Taux de succès" value={`${successRate}%`} tone={successRate > 90 ? "success" : successRate > 70 ? "warning" : "danger"} />
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Card className="glass-strong p-5">
            <h2 className="font-semibold mb-3">Pourquoi les SMS échouent (7 jours)</h2>
            {reasons.length === 0 ? (
              <p className="text-readable-muted text-sm">Aucun échec récent.</p>
            ) : (
              <ul className="space-y-2">
                {reasons.map((r) => (
                  <li key={r.error_code} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                    <div>
                      <div className="font-mono text-xs text-readable-secondary">{r.error_code}</div>
                      <div className="text-sm">{ERROR_LABELS_FR[r.error_code] ?? "Code non répertorié"}</div>
                    </div>
                    <Badge variant="secondary">{r.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="glass-strong p-5">
            <h2 className="font-semibold mb-3">Flux temps réel</h2>
            <div className="space-y-1 max-h-96 overflow-auto">
              {loading && <p className="text-readable-muted text-sm">Chargement…</p>}
              {recent.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs gap-2 border-b border-white/5 py-1.5">
                  <StatusPill status={e.status} />
                  <span className="font-mono text-readable-secondary">{e.normalized_phone ?? "—"}</span>
                  <span className="text-readable-muted truncate flex-1">{e.message_type}{e.error_code ? ` · ${e.error_code}` : ""}</span>
                  <span className="text-readable-muted">{new Date(e.created_at).toLocaleTimeString("fr-CA")}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone: "success" | "info" | "warning" | "danger" | "muted" }) {
  const toneClass = {
    success: "text-emerald-400",
    info: "text-sky-400",
    warning: "text-amber-400",
    danger: "text-rose-400",
    muted: "text-readable-muted",
  }[tone];
  return (
    <Card className="glass-strong p-4">
      <div className="text-xs text-readable-secondary uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</div>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    delivered: "bg-emerald-500/20 text-emerald-300",
    sent: "bg-sky-500/20 text-sky-300",
    sending: "bg-sky-500/20 text-sky-300",
    queued: "bg-slate-500/20 text-slate-300",
    failed: "bg-rose-500/20 text-rose-300",
    undelivered: "bg-amber-500/20 text-amber-300",
    invalid_phone: "bg-zinc-500/20 text-zinc-300",
    blocked: "bg-zinc-500/20 text-zinc-300",
    opted_out: "bg-zinc-500/20 text-zinc-300",
    retry_scheduled: "bg-violet-500/20 text-violet-300",
    contact_required: "bg-rose-500/30 text-rose-200",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tone[status] ?? "bg-white/10"}`}>{status}</span>;
}
