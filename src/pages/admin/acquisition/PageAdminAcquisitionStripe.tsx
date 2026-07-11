import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, RotateCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ReconRow {
  total_events: number;
  processed: number;
  pending: number;
  failed: number;
  paid_no_activation: number;
  activated_no_matching: number;
}

interface EventRow {
  id: string;
  stripe_event_id: string;
  event_type: string;
  contractor_id: string | null;
  session_id: string | null;
  processing_status: string;
  error_message: string | null;
  retry_count: number;
  last_retry_at: string | null;
  received_at: string;
  processed_at: string | null;
}

interface OnboardingRow {
  id: string;
  status: string;
  completion_percent: number;
  business_name: string | null;
  last_activity_at: string;
  checkout_session_id: string | null;
  contractor_id: string | null;
}

export default function PageAdminAcquisitionStripe() {
  const [recon, setRecon] = useState<ReconRow | null>(null);
  const [queue, setQueue] = useState<EventRow[]>([]);
  const [onboardings, setOnboardings] = useState<OnboardingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: r }, { data: q }, { data: o }] = await Promise.all([
        supabase.rpc("stripe_reconciliation_report").maybeSingle(),
        supabase
          .from("v_stripe_events_reprocess_queue" as any)
          .select("*")
          .limit(100),
        supabase
          .from("contractor_onboarding_sessions")
          .select("id, status, completion_percent, business_name, last_activity_at, checkout_session_id, contractor_id")
          .order("last_activity_at", { ascending: false })
          .limit(50),
      ]);
      setRecon((r as any) ?? null);
      setQueue((q as any) ?? []);
      setOnboardings((o as any) ?? []);
    } catch (e: any) {
      toast.error(`Erreur chargement: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reprocess = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const { data, error } = await supabase.functions.invoke("stripe-webhook-reprocess", {
        body: { event_ids: ids },
      });
      if (error) throw error;
      toast.success(`Retraité: ${(data as any)?.ok}/${(data as any)?.processed}`);
      setSelected(new Set());
      await load();
    } catch (e: any) {
      toast.error(`Échec: ${e.message ?? e}`);
    }
  };

  const stuckOnboardings = useMemo(
    () => onboardings.filter((o) =>
      !["activated", "paid"].includes(o.status) &&
      Date.now() - new Date(o.last_activity_at).getTime() > 24 * 3600 * 1000
    ),
    [onboardings]
  );

  const kpis = [
    { label: "Événements", value: recon?.total_events ?? 0, tone: "muted" },
    { label: "Traités", value: recon?.processed ?? 0, tone: "green" },
    { label: "En attente", value: recon?.pending ?? 0, tone: "amber" },
    { label: "Échecs", value: recon?.failed ?? 0, tone: "red" },
    { label: "Payé sans activation", value: recon?.paid_no_activation ?? 0, tone: "red" },
    { label: "Actif sans matching", value: recon?.activated_no_matching ?? 0, tone: "amber" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stripe & Onboarding</h1>
          <p className="text-sm text-muted-foreground">Réconciliation paiements, événements à retraiter, sessions bloquées.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
          </Button>
          <Button
            size="sm"
            onClick={() => reprocess(Array.from(selected))}
            disabled={selected.size === 0}
          >
            <RotateCw className="h-4 w-4 mr-2" /> Retraiter la sélection ({selected.size})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold ${
                k.tone === "red" ? "text-destructive"
                : k.tone === "amber" ? "text-amber-500"
                : k.tone === "green" ? "text-emerald-500" : ""
              }`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> File d'attente de retraitement ({queue.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selected.size === queue.length) setSelected(new Set());
              else setSelected(new Set(queue.map((q) => q.stripe_event_id)));
            }}
          >
            {selected.size === queue.length && queue.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
          </Button>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Aucun événement à retraiter.
            </p>
          ) : (
            <div className="space-y-2">
              {queue.map((e) => (
                <label
                  key={e.stripe_event_id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(e.stripe_event_id)}
                    onChange={(ev) => {
                      const next = new Set(selected);
                      if (ev.target.checked) next.add(e.stripe_event_id);
                      else next.delete(e.stripe_event_id);
                      setSelected(next);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{e.event_type}</code>
                      <Badge variant={
                        e.processing_status === "failed" ? "destructive"
                        : e.processing_status === "processed" ? "default" : "secondary"
                      }>{e.processing_status}</Badge>
                      {e.retry_count > 0 && <Badge variant="outline">retry {e.retry_count}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(e.received_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{e.stripe_event_id}</p>
                    {e.error_message && (
                      <p className="text-xs text-destructive mt-1 line-clamp-2">{e.error_message}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={(ev) => { ev.preventDefault(); reprocess([e.stripe_event_id]); }}>
                    <RotateCw className="h-3 w-3" />
                  </Button>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4" /> Onboardings bloqués +24h ({stuckOnboardings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stuckOnboardings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune session bloquée.</p>
          ) : (
            <div className="space-y-2">
              {stuckOnboardings.map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{o.business_name || "(sans nom)"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{o.status}</Badge>
                      <span className="text-xs text-muted-foreground">{o.completion_percent}%</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(o.last_activity_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
