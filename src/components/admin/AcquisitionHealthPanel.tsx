import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "ok" | "stale" | "missing" | "unconfigured";

interface ProviderHealth {
  provider: string;
  credentials_present?: boolean;
  webhook_last_event_at?: string | null;
  recent_send_count?: number;
  recent_webhook_count?: number;
  links_created?: number;
  last_click_at?: string | null;
  status: Status;
  message: string;
  setup_url?: string;
}

interface HealthResponse {
  twilio: ProviderHealth;
  resend: ProviderHealth;
  stripe: ProviderHealth;
  redirect_tracker: ProviderHealth;
  generated_at: string;
}

const COLORS: Record<Status, string> = {
  ok: "rgb(34 197 94)",
  stale: "rgb(245 158 11)",
  missing: "rgb(239 68 68)",
  unconfigured: "rgb(148 163 184)",
};

const LABELS: Record<Status, string> = {
  ok: "OK",
  stale: "Inactif",
  missing: "Webhook manquant",
  unconfigured: "Non configuré",
};

function HealthRow({ label, h }: { label: string; h: ProviderHealth }) {
  const color = COLORS[h.status];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
          <div className="text-sm font-medium text-white/90">{label}</div>
        </div>
        <span className="text-[11px] uppercase tracking-wider" style={{ color }}>
          {LABELS[h.status]}
        </span>
      </div>
      <div className="mt-2 text-xs text-white/70">{h.message}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-white/50">
        {h.recent_send_count !== undefined && <div>Sends 7j : <span className="text-white/80">{h.recent_send_count}</span></div>}
        {h.recent_webhook_count !== undefined && <div>Webhooks 7j : <span className="text-white/80">{h.recent_webhook_count}</span></div>}
        {h.links_created !== undefined && <div>Liens : <span className="text-white/80">{h.links_created}</span></div>}
        {h.webhook_last_event_at && <div className="col-span-2">Dernier événement : <span className="text-white/80">{new Date(h.webhook_last_event_at).toLocaleString("fr-CA")}</span></div>}
        {h.last_click_at && <div className="col-span-2">Dernier clic : <span className="text-white/80">{new Date(h.last_click_at).toLocaleString("fr-CA")}</span></div>}
      </div>
      {h.setup_url && (h.status === "missing" || h.status === "unconfigured") && (
        <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-200/90">
          Endpoint à configurer : <code className="text-amber-100">{h.setup_url}</code>
        </div>
      )}
    </div>
  );
}

export function AcquisitionHealthPanel() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("acquisition-health-check");
      if (error) throw error;
      setData(data as HealthResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Santé du pipeline d'acquisition</h2>
          <p className="text-xs text-white/50">Webhooks providers + redirect tracker — source de vérité événementielle.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "…" : "Rafraîchir"}
        </button>
      </div>
      {error && <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</div>}
      {data && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <HealthRow label="Twilio (SMS)" h={data.twilio} />
          <HealthRow label="Resend (Email)" h={data.resend} />
          <HealthRow label="Stripe (Paiements)" h={data.stripe} />
          <HealthRow label="Redirect Tracker (/r/)" h={data.redirect_tracker} />
        </div>
      )}
      {!data && !loading && !error && <div className="text-xs text-white/50">Aucune donnée.</div>}
    </section>
  );
}
