import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Health = {
  mobile: number;
  landline: number;
  voip: number;
  unknown: number;
  sms_disabled: number;
  with_email: number;
  total: number;
  sms_sent: number;
  sms_delivered: number;
  sms_failed: number;
  email_sent: number;
  email_delivered: number;
  landline_30006: number;
  email_fallback: number;
  needs_manual: number;
  sms_delivery_rate_mobile_pct: number;
};

export default function ChannelRoutingCard() {
  const [data, setData] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await (supabase as any)
        .from("v_channel_routing_health")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      setData(data as Health);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const runBackfill = async () => {
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("acq-phone-backfill", { body: { max_lookups: 200 } });
      if (error) throw error;
      const r = data as any;
      toast.success(`Backfill: ${r?.quarantined_30006 ?? 0} quarantined • ${r?.mobile ?? 0} mobile • ${r?.landline ?? 0} landline`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Backfill error");
    } finally {
      setBackfilling(false);
    }
  };

  if (err) {
    return (
      <Card className="p-4 border-amber-500/40 bg-amber-500/5">
        <div className="text-sm text-amber-200">Channel routing health indisponible — {err}</div>
      </Card>
    );
  }
  if (!data) return <Card className="p-4 text-sm text-muted-foreground">Chargement routage canal…</Card>;

  const pct = (n: number) => data.total > 0 ? Math.round((n / data.total) * 100) : 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold">Routage canal (SMS vs Email)</h2>
          <p className="text-xs text-muted-foreground mt-1">
            SMS uniquement vers mobiles. Landlines/voip → email automatique. Sinon revue manuelle.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={runBackfill} disabled={backfilling}>
          {backfilling ? "Backfill en cours…" : "Lancer backfill phone_type"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Tile label="Mobile" value={data.mobile} pct={pct(data.mobile)} tone="emerald" />
        <Tile label="Landline" value={data.landline} pct={pct(data.landline)} tone="amber" />
        <Tile label="VoIP" value={data.voip} pct={pct(data.voip)} tone="amber" />
        <Tile label="Inconnu" value={data.unknown} pct={pct(data.unknown)} tone="red" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Mini label="SMS envoyés (7j)" value={data.sms_sent} />
        <Mini label="SMS livrés (7j)" value={data.sms_delivered} accent="emerald" />
        <Mini label="Taux livraison mobile" value={`${data.sms_delivery_rate_mobile_pct}%`} accent="emerald" />
        <Mini label="SMS échec provider (7j)" value={data.sms_failed} accent="red" />
        <Mini label="Email envoyés (7j)" value={data.email_sent} />
        <Mini label="Email fallback landline" value={data.email_fallback} accent="emerald" />
        <Mini label="Revue manuelle requise" value={data.needs_manual} accent="amber" />
        <Mini label="30006 historiques" value={data.landline_30006} accent="amber" />
      </div>
    </Card>
  );
}

function Tile({ label, value, pct, tone }: { label: string; value: number; pct: number; tone: "emerald" | "amber" | "red" }) {
  const toneClass = tone === "emerald"
    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
    : tone === "amber"
      ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
      : "border-red-500/40 bg-red-500/5 text-red-300";
  return (
    <div className={`p-3 rounded-lg border ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      <Badge variant="secondary" className="mt-1 text-[10px]">{pct}%</Badge>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: number | string; accent?: "emerald" | "red" | "amber" }) {
  const color = accent === "emerald" ? "text-emerald-300" : accent === "red" ? "text-red-300" : accent === "amber" ? "text-amber-300" : "";
  return (
    <div className="p-2 rounded-md border border-border bg-muted/30">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
