/**
 * UNPRO — Email Health Center v2 (Truth Layer)
 * PROTECTED FILE — every indicator comes from live verification.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldAlert, ShieldX, PlayCircle, SendHorizonal, Download, Eye, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface HealthV2 {
  status: "healthy" | "degraded" | "failed";
  reason: string;
  impact: string;
  error_category: string | null;
  config: {
    resend_key_loaded: boolean;
    fingerprint: string | null;
    sender_email: string;
    sender_name: string;
    from_header: string;
    reply_to: string;
    environment: string;
  };
  domain: {
    domain: string;
    verified: boolean;
    status?: string;
    spf?: { status: string; record: string | null } | null;
    dkim?: { status: string; record: string | null } | null;
    dmarc?: { status: string; record: string | null } | null;
    records?: any[] | null;
  };
  sender: { email: string; name: string; valid: boolean };
  lastLiveSend: string | null;
  liveSendOkWithin30min: boolean;
  raw_resend: any;
  root_causes: { category: string; occurrences: number; last_seen: string }[];
  revenue_impact: {
    pending_onboarding: number;
    failed_onboarding_emails_24h: number;
    plan_avg_cad: number;
    activation_rate: number;
    estimated_lost_revenue_cad: number;
  };
  latency_ms: number;
  checked_at: string;
}

interface LiveTestResult {
  ok: boolean;
  message_id: string | null;
  provider_status: number;
  provider_response: any;
  latency_ms: number;
  error_category: string;
  error_message: string | null;
}

const useHealth = () =>
  useQuery({
    queryKey: ["email-health-v2"],
    queryFn: async (): Promise<HealthV2> => {
      const { data, error } = await supabase.functions.invoke("email-health-v2");
      if (error) throw error;
      return data as HealthV2;
    },
    refetchInterval: 30_000,
  });

const useLiveTest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipient: string): Promise<LiveTestResult> => {
      const { data, error } = await supabase.functions.invoke("email-live-test", {
        body: { recipient, triggered_by: "manual" },
      });
      if (error && !data) throw error;
      return data as LiveTestResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-health-v2"] }),
  });
};

const useEvents = () =>
  useQuery({
    queryKey: ["email-delivery-events-50"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_delivery_events")
        .select("id, event_at, recipient_email, event_type, provider_name, message_id, metadata_json")
        .order("event_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

const STATUS_CFG = {
  healthy: { Icon: ShieldCheck, label: "HEALTHY", tone: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  degraded: { Icon: ShieldAlert, label: "DEGRADED", tone: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
  failed: { Icon: ShieldX, label: "FAILED", tone: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/30" },
} as const;

function Hero({ h }: { h?: HealthV2 }) {
  const s = h?.status ?? "failed";
  const cfg = STATUS_CFG[s];
  const Icon = cfg.Icon;
  return (
    <div className={`rounded-2xl border ${cfg.ring} ring-1 ${cfg.bg} p-6 space-y-3`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${cfg.bg}`}><Icon className={`h-8 w-8 ${cfg.tone}`} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={`text-2xl font-bold ${cfg.tone}`}>{cfg.label}</h1>
            {h?.error_category && h.error_category !== "NONE" && (
              <Badge variant="outline" className="uppercase text-[10px]">{h.error_category}</Badge>
            )}
          </div>
          <p className="text-sm text-foreground mt-1">{h?.reason ?? "Chargement…"}</p>
          <p className="text-xs text-muted-foreground mt-1">{h?.impact}</p>
          {h?.lastLiveSend && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Dernier envoi live vérifié : {formatDistanceToNow(new Date(h.lastLiveSend), { addSuffix: true, locale: fr })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigCard({ h }: { h?: HealthV2 }) {
  const c = h?.config;
  const row = (k: string, v: string, ok?: boolean) => (
    <div className="flex justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-mono ${ok === false ? "text-destructive" : "text-foreground"}`}>{v}</span>
    </div>
  );
  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 space-y-1">
      <h3 className="text-sm font-semibold mb-2">Configuration réelle</h3>
      {row("RESEND_API_KEY", c?.resend_key_loaded ? "chargée" : "MANQUANTE", !!c?.resend_key_loaded)}
      {row("Fingerprint", c?.fingerprint ?? "—")}
      {row("Sender", c?.sender_email ?? "—")}
      {row("From", c?.from_header ?? "—")}
      {row("Reply-To", c?.reply_to ?? "—")}
      {row("Environnement", c?.environment ?? "—")}
    </div>
  );
}

function DomainCard({ h }: { h?: HealthV2 }) {
  const d = h?.domain;
  const badge = (label: string, entry?: { status: string; record: string | null } | null) => {
    const s = (entry?.status || "").toLowerCase();
    const tone = s === "verified" || s === "valid" ? "bg-emerald-500/15 text-emerald-500"
      : s === "pending" ? "bg-amber-500/15 text-amber-500"
      : "bg-destructive/15 text-destructive";
    return (
      <div className="flex items-center justify-between text-xs py-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className={`px-2 py-0.5 rounded-md ${tone} uppercase text-[10px] font-semibold`}>{entry?.status ?? "N/A"}</span>
      </div>
    );
  };
  return (
    <div className="rounded-xl border border-border/30 bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Domaine · {d?.domain ?? "—"}</h3>
        <Badge variant={d?.verified ? "default" : "destructive"}>{d?.status ?? (d?.verified ? "verified" : "invalid")}</Badge>
      </div>
      {badge("SPF", d?.spf)}
      {badge("DKIM", d?.dkim)}
      {badge("DMARC", d?.dmarc)}
    </div>
  );
}

function LiveTestPanel({ h }: { h?: HealthV2 }) {
  const [recipient, setRecipient] = useState("admin@unpro.ca");
  const [result, setResult] = useState<LiveTestResult | null>(null);
  const test = useLiveTest();

  const run = () => {
    test.mutate(recipient, {
      onSuccess: (data) => {
        setResult(data);
        data.ok ? toast.success(`Envoyé — ${data.message_id}`) : toast.error(`Échec: ${data.error_category}`);
      },
      onError: (e: any) => toast.error(e?.message ?? "Erreur envoi"),
    });
  };

  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Test Resend en direct</h3>
      <div className="flex gap-2">
        <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="admin@unpro.ca" />
        <Button onClick={run} disabled={test.isPending} className="gap-2">
          {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          Envoyer
        </Button>
      </div>
      {result && (
        <div className={`rounded-lg p-3 text-xs space-y-1 border ${result.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div>Statut HTTP: <b>{result.provider_status}</b> · Latence: <b>{result.latency_ms}ms</b></div>
          {result.message_id && <div>Message ID: <span className="font-mono">{result.message_id}</span></div>}
          {result.error_category !== "NONE" && <div>Catégorie: <b>{result.error_category}</b></div>}
          {result.error_message && <div className="text-destructive">Erreur: {result.error_message}</div>}
          <pre className="mt-1 max-h-40 overflow-auto text-[10px] p-2 rounded bg-background/60">{JSON.stringify(result.provider_response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function RootCauseCard({ h }: { h?: HealthV2 }) {
  const cats = h?.root_causes ?? [];
  return (
    <div className="rounded-xl border border-border/30 bg-card p-4">
      <h3 className="text-sm font-semibold mb-2">Causes racines (24h)</h3>
      {cats.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune défaillance classifiée sur les 24 dernières heures.</p>
      ) : (
        <div className="space-y-1.5">
          {cats.map((c) => (
            <div key={c.category} className="flex justify-between text-xs">
              <span className="font-mono">{c.category}</span>
              <span className="font-semibold">{c.occurrences}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RevenueCard({ h }: { h?: HealthV2 }) {
  const r = h?.revenue_impact;
  if (!r) return null;
  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold">Impact revenu</h3>
      <div className="text-xs text-muted-foreground">Onboarding en attente : <b className="text-foreground">{r.pending_onboarding}</b></div>
      <div className="text-xs text-muted-foreground">Emails onboarding échoués (24h) : <b className="text-foreground">{r.failed_onboarding_emails_24h}</b></div>
      <div className="text-xs text-muted-foreground">Plan moyen : <b className="text-foreground">{r.plan_avg_cad} $ CAD</b></div>
      <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="text-[10px] uppercase text-destructive font-semibold">Revenu à risque</div>
        <div className="text-xl font-bold text-destructive">
          {r.estimated_lost_revenue_cad.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
        </div>
      </div>
    </div>
  );
}

function EventsTable() {
  const { data } = useEvents();
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = (data ?? []).filter((e: any) => {
    if (filter !== "all" && e.event_type !== filter) return false;
    if (q && !(e.recipient_email ?? "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const chip = (v: string, label: string) => (
    <button
      key={v}
      onClick={() => setFilter(v)}
      className={`text-[11px] px-2.5 py-1 rounded-full border ${filter === v ? "bg-primary text-primary-foreground border-primary" : "border-border/40 text-muted-foreground hover:text-foreground"}`}
    >{label}</button>
  );

  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">50 derniers événements</h3>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par destinataire" className="max-w-xs h-8 text-xs" />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {chip("all", "Tous")}
        {chip("sent", "Envoyés")}
        {chip("delivered", "Livrés")}
        {chip("bounced", "Bounces")}
        {chip("failed", "Échecs")}
      </div>
      <div className="overflow-auto max-h-96">
        <table className="w-full text-xs">
          <thead className="text-left text-muted-foreground border-b border-border/30">
            <tr>
              <th className="py-2 pr-2">Quand</th>
              <th className="pr-2">Destinataire</th>
              <th className="pr-2">Type</th>
              <th className="pr-2">Provider ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e: any) => (
              <tr key={e.id} className="border-b border-border/20">
                <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(e.event_at).toLocaleString("fr-CA")}</td>
                <td className="pr-2 truncate max-w-[180px]">{e.recipient_email}</td>
                <td className="pr-2">
                  <span className={`px-1.5 py-0.5 rounded ${
                    e.event_type === "sent" || e.event_type === "delivered" ? "bg-emerald-500/15 text-emerald-500"
                    : e.event_type === "bounced" || e.event_type === "failed" ? "bg-destructive/15 text-destructive"
                    : "bg-muted text-muted-foreground"
                  }`}>{e.event_type}</span>
                </td>
                <td className="pr-2 font-mono truncate max-w-[140px]">{e.message_id ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Aucun événement.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PageEmailHealthCenterV2() {
  const { data: h, isLoading, refetch, isFetching } = useHealth();
  const [showRaw, setShowRaw] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const exportFailures = async () => {
    const { data } = await supabase
      .from("email_delivery_events")
      .select("*")
      .in("event_type", ["failed", "bounced"])
      .order("event_at", { ascending: false })
      .limit(500);
    const csv = ["event_at,recipient_email,event_type,message_id,error"]
      .concat((data ?? []).map((r: any) => [r.event_at, r.recipient_email, r.event_type, r.message_id ?? "", (r.metadata_json?.error_message ?? "").replace(/,/g, ";")].join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "email_failures.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Email Health · Truth Layer</h1>
          <p className="text-sm text-muted-foreground">Chaque indicateur vient d'une vérification live. Aucun statut n'est dérivé des logs seuls.</p>
        </div>

        <Hero h={h} />

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => refetch()} disabled={isFetching} className="gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Lancer un check
          </Button>
          <Button variant="outline" onClick={exportFailures} className="gap-2"><Download className="h-4 w-4" />Export CSV échecs</Button>
          <Button variant="outline" onClick={() => setShowRaw(true)} className="gap-2"><Eye className="h-4 w-4" />Réponse Resend brute</Button>
          <Button variant="outline" onClick={() => setShowConfig(true)} className="gap-2"><Settings2 className="h-4 w-4" />Config runtime</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ConfigCard h={h} />
          <DomainCard h={h} />
          <RootCauseCard h={h} />
          <RevenueCard h={h} />
        </div>

        <LiveTestPanel h={h} />
        <EventsTable />

        {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Vérification en cours…</div>}

        <Dialog open={showRaw} onOpenChange={setShowRaw}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Réponse Resend brute</DialogTitle></DialogHeader>
            <pre className="text-[11px] max-h-[60vh] overflow-auto bg-muted p-3 rounded">{JSON.stringify(h?.raw_resend, null, 2)}</pre>
          </DialogContent>
        </Dialog>

        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Configuration runtime</DialogTitle></DialogHeader>
            <pre className="text-[11px] max-h-[60vh] overflow-auto bg-muted p-3 rounded">{JSON.stringify(h?.config, null, 2)}</pre>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
