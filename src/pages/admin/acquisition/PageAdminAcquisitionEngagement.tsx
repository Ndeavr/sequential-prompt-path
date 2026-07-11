import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Mail, MessageSquare, MousePointerClick, ShieldCheck, CreditCard, Zap, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface FunnelRow {
  event_type: string;
  channel: string;
  count_24h: number;
  count_7d: number;
  count_total: number;
  last_at: string | null;
}

interface RecentEvent {
  id: string;
  event_type: string;
  channel: string | null;
  status: string | null;
  provider: string | null;
  provider_message_id: string | null;
  tracking_id: string | null;
  error_code: string | null;
  error_message: string | null;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
}

const STAGE_ORDER = [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "onboarding_started",
  "onboarding_step",
  "onboarding_completed",
  "checkout_started",
  "paid",
  "activated",
  "failed",
  "bounced",
  "undelivered",
];

const STAGE_LABEL: Record<string, string> = {
  queued: "En file",
  sent: "Envoyé",
  delivered: "Livré",
  opened: "Ouvert",
  clicked: "Cliqué",
  onboarding_started: "Onboarding démarré",
  onboarding_step: "Étape onboarding",
  onboarding_completed: "Onboarding complété",
  checkout_started: "Checkout démarré",
  paid: "Payé",
  activated: "Activé",
  failed: "Échec",
  bounced: "Bounce",
  undelivered: "Non livré",
  complained: "Plainte",
};

const STAGE_ICON: Record<string, JSX.Element> = {
  sent: <Mail className="h-4 w-4" />,
  delivered: <Mail className="h-4 w-4" />,
  opened: <Mail className="h-4 w-4" />,
  clicked: <MousePointerClick className="h-4 w-4" />,
  onboarding_started: <ShieldCheck className="h-4 w-4" />,
  onboarding_completed: <ShieldCheck className="h-4 w-4" />,
  checkout_started: <CreditCard className="h-4 w-4" />,
  paid: <CreditCard className="h-4 w-4" />,
  activated: <Zap className="h-4 w-4" />,
  failed: <AlertTriangle className="h-4 w-4" />,
};

function useFunnel() {
  return useQuery<FunnelRow[]>({
    queryKey: ["engagement-funnel"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_engagement_funnel_24h")
        .select("*");
      if (error) throw error;
      return (data ?? []) as FunnelRow[];
    },
    refetchInterval: 15_000,
  });
}

function useRecent() {
  return useQuery<RecentEvent[]>({
    queryKey: ["engagement-recent"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_engagement_recent")
        .select("*")
        .limit(100);
      if (error) throw error;
      return (data ?? []) as RecentEvent[];
    },
    refetchInterval: 15_000,
  });
}

export default function PageAdminAcquisitionEngagement() {
  const { data: funnel, isLoading } = useFunnel();
  const { data: recent } = useRecent();

  const byStage = useMemo(() => {
    const m = new Map<string, { count_24h: number; count_7d: number; count_total: number; last_at: string | null; channels: Set<string> }>();
    for (const row of funnel ?? []) {
      const cur = m.get(row.event_type) ?? { count_24h: 0, count_7d: 0, count_total: 0, last_at: null as string | null, channels: new Set<string>() };
      cur.count_24h += row.count_24h;
      cur.count_7d += row.count_7d;
      cur.count_total += row.count_total;
      cur.channels.add(row.channel);
      if (!cur.last_at || (row.last_at && row.last_at > cur.last_at)) cur.last_at = row.last_at;
      m.set(row.event_type, cur);
    }
    return m;
  }, [funnel]);

  const stages = STAGE_ORDER.filter((s) => byStage.has(s));
  const extras = Array.from(byStage.keys()).filter((k) => !STAGE_ORDER.includes(k));
  const orderedStages = [...stages, ...extras];

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Engagement pipeline</h1>
          <p className="text-muted-foreground">
            Chaque envoi, livraison, ouverture, clic, onboarding, paiement et activation — en direct.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="h-3 w-3" /> Rafraîchi toutes les 15 s
        </Badge>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        {!isLoading &&
          orderedStages.map((stage) => {
            const s = byStage.get(stage)!;
            const isDead = s.count_24h === 0;
            const isFailure = ["failed", "bounced", "undelivered", "complained"].includes(stage);
            return (
              <Card key={stage} className={isFailure ? "border-destructive/40" : undefined}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wide">
                    {STAGE_ICON[stage] ?? <Activity className="h-4 w-4" />}
                    {STAGE_LABEL[stage] ?? stage}
                  </CardDescription>
                  <CardTitle className="text-3xl">{s.count_24h}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pt-0 text-xs text-muted-foreground">
                  <div>7 j : <span className="font-medium text-foreground">{s.count_7d}</span> — total : {s.count_total}</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(s.channels).map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                  {isDead && !isFailure && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> 0 en 24 h
                    </div>
                  )}
                  {s.last_at && (
                    <div>dernier : {formatDistanceToNow(new Date(s.last_at), { addSuffix: true, locale: fr })}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Derniers événements</CardTitle>
            <CardDescription>100 événements les plus récents — tous canaux confondus.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Quand</th>
                  <th className="py-2 pr-4">Événement</th>
                  <th className="py-2 pr-4">Canal</th>
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Message id</th>
                  <th className="py-2 pr-4">Erreur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(recent ?? []).map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {formatDistanceToNow(new Date(e.occurred_at), { addSuffix: true, locale: fr })}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={["failed","bounced","undelivered"].includes(e.event_type) ? "destructive" : "secondary"}>
                        {STAGE_LABEL[e.event_type] ?? e.event_type}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{e.channel ?? "—"}</td>
                    <td className="py-2 pr-4">{e.provider ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{e.provider_message_id ?? e.tracking_id ?? "—"}</td>
                    <td className="py-2 pr-4 text-destructive">
                      {e.error_code ? `${e.error_code}: ${e.error_message ?? ""}` : ""}
                    </td>
                  </tr>
                ))}
                {(!recent || recent.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Aucun événement enregistré pour l'instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
