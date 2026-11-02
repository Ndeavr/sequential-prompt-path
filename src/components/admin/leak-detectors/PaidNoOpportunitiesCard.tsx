/**
 * PaidNoOpportunitiesCard — First-revenue (350 $ activation) leak detector.
 *
 * Surfaces contractors with an active paid subscription who received
 * ZERO matches over the last 7 days, based on LIVE Stripe proof only.
 * Non-contractual follow-up (350 activation includes no appointment by default).
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

import { classifyContractor, formatSpecialty, type Classification } from "./paidLiveClassifier";

interface LeakRow {
  contractor_id: string;
  business_name: string;
  city: string | null;
  specialty: string | null;
  source: string;
  new_lt_7d: boolean;
  appointment_quota: number | null;
}

interface LeakResult {
  verifiedLive: number;
  excluded: Record<string, number>;
  rows: LeakRow[];
}

function must<T>(r: { data: T | null; error: any }, label: string): T {
  if (r.error) throw new Error(`${label}: ${r.error.message ?? r.error}`);
  return (r.data ?? ([] as unknown as T));
}

async function fetchLeaks(): Promise<LeakResult> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const sb = supabase as any;
  const [subsR, ledR] = await Promise.all([
    sb.from("contractor_subscriptions").select("contractor_id, status, stripe_subscription_id, created_at").eq("status", "active"),
    sb.from("contractor_activation_ledger").select("contractor_id, action, source, created_at, metadata").in("action", ["entry_activation_350_paid", "deactivated"]),
  ]);
  const subs = must<any[]>(subsR, "abonnements");
  const ledger = must<any[]>(ledR, "registre d'activation");
  const ids = Array.from(new Set([...subs.map((s) => s.contractor_id), ...ledger.filter((l) => l.action === "entry_activation_350_paid").map((l) => l.contractor_id)].filter(Boolean)));
  if (ids.length === 0) return { verifiedLive: 0, excluded: {}, rows: [] };

  const evs = must<any[]>(await sb.from("stripe_webhook_events")
    .select("contractor_id, event_type, livemode, success, session_id, stripe_event_id, created_at")
    .in("contractor_id", ids), "événements Stripe");

  const excluded: Record<string, number> = {};
  const live: { id: string; c: Extract<Classification, { kind: "live_paid" }> }[] = [];
  for (const id of ids) {
    const c = classifyContractor(id, subs, ledger, evs);
    if (c.kind === "live_paid") live.push({ id, c });
    else excluded[c.reason] = (excluded[c.reason] ?? 0) + 1;
  }
  if (live.length === 0) return { verifiedLive: 0, excluded, rows: [] };

  const liveIds = live.map((l) => l.id);
  const [mR, cR, eR] = await Promise.all([
    sb.from("matches").select("contractor_id").in("contractor_id", liveIds).gte("created_at", since),
    sb.from("contractors").select("id, business_name, city, specialty").in("id", liveIds),
    sb.from("contractor_entitlements").select("contractor_id, appointment_quota").in("contractor_id", liveIds),
  ]);
  const matched = new Set(must<any[]>(mR, "matchs").map((m) => m.contractor_id));
  const contractors = new Map(must<any[]>(cR, "entrepreneurs").map((c) => [c.id, c]));
  const quota = new Map(must<any[]>(eR, "droits").map((e) => [e.contractor_id, e.appointment_quota]));

  const rows = live.filter((l) => !matched.has(l.id)).map(({ id, c }) => {
    const ct = contractors.get(id) ?? {};
    return {
      contractor_id: id,
      business_name: ct.business_name ?? "—",
      city: ct.city ?? null,
      specialty: formatSpecialty(ct.specialty),
      source: c.source === "activation_350" ? "Activation 350 $" : "Abonnement",
      new_lt_7d: c.new_lt_7d,
      appointment_quota: quota.get(id) ?? null,
    };
  });
  return { verifiedLive: live.length, excluded, rows };
}

const REASON_LABEL: Record<string, string> = {
  test_mode: "mode test",
  no_stripe_proof: "sans preuve Stripe LIVE",
  refunded_or_cancelled: "remboursé/annulé",
  expired: "droit expiré",
};

export default function PaidNoOpportunitiesCard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leak-paid-no-opportunities-live"],
    queryFn: fetchLeaks,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 0,
  });

  // Follow-up only: count paid >= 7 days with zero match. Profile-350 includes no appointment by default.
  const followUp = (data?.rows ?? []).filter((r) => !r.new_lt_7d);
  const count = followUp.length;
  const isLeak = !isError && count > 0;
  const unknown = isError || isLoading;

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID copié");
  };

  return (
    <Card className={isError ? "border-destructive/50" : isLeak ? "border-amber-500/50" : "border-border"}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {isError || isLeak ? (
              <AlertOctagon className={`h-5 w-5 ${isError ? "text-destructive" : "text-amber-500"}`} />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            Entrepreneurs payants sans opportunité (7 j)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Suivi non contractuel : paiement LIVE vérifié (Stripe signé), payé depuis 7 j ou plus, aucun match sur 7 j. L'activation 350 $ n'inclut aucun rendez-vous par défaut.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isError
              ? `Données non vérifiables : ${(error as Error)?.message ?? "erreur"}`
              : data
                ? `${data.verifiedLive} payant(s) LIVE vérifié(s) · exclus : ${Object.entries(data.excluded).map(([k, v]) => `${v} ${REASON_LABEL[k] ?? k}`).join(", ") || "aucun"}${data.rows.length - count > 0 ? ` · ${data.rows.length - count} récent(s) < 7 j` : ""}`
                : ""}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${isError ? "text-destructive" : isLeak ? "text-amber-500" : "text-foreground"}`}>
            {isLoading ? "…" : isError ? "?" : count}
          </div>
          <Badge variant={isError ? "destructive" : "secondary"} className="mt-1">
            {isError ? "Inconnu" : unknown ? "…" : isLeak ? "À suivre" : "Aucun à suivre"}
          </Badge>
          {isError && <Button size="sm" variant="outline" className="mt-2 min-h-11" onClick={() => refetch()}>Réessayer</Button>}
        </div>
      </CardHeader>

      {isLeak && (
        <CardContent className="pt-0">
          <div className="max-h-72 overflow-auto rounded-md border border-border/50 divide-y divide-border/50">
            {followUp.slice(0, 20).map((r) => (
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
                    {r.source}{r.appointment_quota ? ` · ${r.appointment_quota} RDV inclus` : ""}
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
