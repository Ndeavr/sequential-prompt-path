/**
 * PaidNoOpportunitiesCard — First-$1 leak detector.
 *
 * Surfaces contractors with an active paid subscription who received
 * ZERO matches over the last 7 days. This number MUST always be zero —
 * anything else is a silent revenue leak.
 *
 * Mounted at the top of AdminOperationsHub. Refreshes every 60s.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertOctagon, CheckCircle2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeakRow {
  contractor_id: string;
  business_name: string;
  city: string | null;
  specialty: string | null;
  status: string;
  current_period_end: string | null;
  last_match_at: string | null;
}

async function fetchLeaks(): Promise<LeakRow[]> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  // 1. Active paying contractors
  const { data: subs } = await (supabase as any)
    .from("contractor_subscriptions")
    .select("contractor_id, status, current_period_end")
    .eq("status", "active");

  const ids: string[] = (subs ?? []).map((s: any) => s.contractor_id).filter(Boolean);
  if (ids.length === 0) return [];

  // 2. Matches in last 7d for those contractors
  const { data: recentMatches } = await (supabase as any)
    .from("matches")
    .select("contractor_id, created_at")
    .in("contractor_id", ids)
    .gte("created_at", since);

  const lastByContractor = new Map<string, string>();
  (recentMatches ?? []).forEach((m: any) => {
    const prev = lastByContractor.get(m.contractor_id);
    if (!prev || m.created_at > prev) lastByContractor.set(m.contractor_id, m.created_at);
  });

  const leakIds = ids.filter((id) => !lastByContractor.has(id));
  if (leakIds.length === 0) return [];

  // 3. Contractor details for leak set
  const { data: contractors } = await (supabase as any)
    .from("contractors")
    .select("id, business_name, city, specialty")
    .in("id", leakIds);

  const subByContractor = new Map<string, any>();
  (subs ?? []).forEach((s: any) => subByContractor.set(s.contractor_id, s));

  return (contractors ?? []).map((c: any) => {
    const sub = subByContractor.get(c.id) ?? {};
    return {
      contractor_id: c.id,
      business_name: c.business_name,
      city: c.city,
      specialty: c.specialty,
      status: sub.status ?? "unknown",
      current_period_end: sub.current_period_end ?? null,
      last_match_at: null,
    } as LeakRow;
  });
}

export default function PaidNoOpportunitiesCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["leak-paid-no-opportunities"],
    queryFn: fetchLeaks,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const count = data?.length ?? 0;
  const isLeak = count > 0;

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID copié");
  };

  return (
    <Card className={isLeak ? "border-destructive/50" : "border-emerald-500/40"}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {isLeak ? (
              <AlertOctagon className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            Entrepreneurs payants sans opportunité (7 j)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Abonnement actif + zéro match sur les 7 derniers jours. Doit toujours être 0.
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${isLeak ? "text-destructive" : "text-emerald-500"}`}>
            {isLoading ? "…" : count}
          </div>
          <Badge variant={isLeak ? "destructive" : "secondary"} className="mt-1">
            {isLeak ? "DOIT ÊTRE 0" : "OK"}
          </Badge>
        </div>
      </CardHeader>

      {isLeak && (
        <CardContent className="pt-0">
          <div className="max-h-72 overflow-auto rounded-md border border-border/50 divide-y divide-border/50">
            {(data ?? []).slice(0, 20).map((r) => (
              <div
                key={r.contractor_id}
                className="p-3 flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.business_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[r.city, r.specialty].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    {r.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyId(r.contractor_id)}
                    title="Copier l'ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {count > 20 && (
            <p className="text-xs text-muted-foreground mt-2">
              …et {count - 20} autres. Utilisez le journal d'événements pour la liste complète.
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Rafraîchir
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
