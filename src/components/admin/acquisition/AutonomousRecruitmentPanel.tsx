/**
 * Autonomous recruitment — today's real production state.
 * Read-only. Every number comes from a canonical production table:
 *  - recruitment_controls / recruitment_runs  → orchestrator status & schedule
 *  - verified_contractor_prospects            → discovered / eligible
 *  - acq_sms_logs                             → contacted / delivered / failures
 *  - verified_prospect_tokens                 → clicks
 *  - acquisition_pipeline_events              → registrations, payments, compliance, duplicates
 * No estimates, no mock data.
 */
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

type Metrics = {
  controls: Record<string, unknown> | null;
  lastRun: { started_at: string | null; status: string | null } | null;
  discovered: number;
  eligible: number;
  contacted: number;
  delivered: number;
  clicked: number;
  registrations: number;
  paid: number;
  activated: number;
  complianceBlocked: number;
  duplicateSkipped: number;
  failures: Array<{ reason: string; count: number }>;
};

async function fetchMetrics(): Promise<Metrics> {
  const since = startOfTodayIso();
  const count = async (
    table: string,
    build: (q: any) => any,
  ): Promise<number> => {
    const { count: c } = await build(
      (supabase as any).from(table).select("id", { count: "exact", head: true }),
    );
    return c ?? 0;
  };

  const [
    controlsRes,
    runRes,
    discovered,
    eligible,
    contacted,
    delivered,
    clicked,
    smsFailRows,
    eventRows,
  ] = await Promise.all([
    (supabase as any).from("recruitment_controls").select("*").limit(1).maybeSingle(),
    (supabase as any)
      .from("recruitment_runs")
      .select("started_at, status")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    count("verified_contractor_prospects", (q) => q.gte("created_at", since)),
    count("verified_contractor_prospects", (q) =>
      q
        .eq("outreach_status", "none")
        .eq("verification_status", "verified")
        .gte("data_quality_score", 80)
        .not("website_url", "is", null),
    ),
    count("acq_sms_logs", (q) => q.gte("created_at", since)),
    count("acq_sms_logs", (q) => q.gte("created_at", since).eq("status", "delivered")),
    count("verified_prospect_tokens", (q) => q.gte("clicked_at", since)),
    (supabase as any)
      .from("acq_sms_logs")
      .select("status, error_message")
      .gte("created_at", since)
      .neq("status", "delivered")
      .limit(500),
    (supabase as any)
      .from("acquisition_pipeline_events")
      .select("stage, reason_code")
      .gte("created_at", since)
      .limit(2000),
  ]);

  const events = (eventRows?.data ?? []) as Array<{ stage: string; reason_code: string | null }>;
  const stage = (s: string) => events.filter((e) => e.stage === s).length;

  const failureMap = new Map<string, number>();
  for (const row of (smsFailRows?.data ?? []) as Array<{ status: string; error_message: string | null }>) {
    const key = row.error_message ? `${row.status}: ${String(row.error_message).slice(0, 80)}` : row.status;
    failureMap.set(key, (failureMap.get(key) ?? 0) + 1);
  }
  for (const e of events) {
    if (e.stage === "failed" && e.reason_code) {
      failureMap.set(e.reason_code, (failureMap.get(e.reason_code) ?? 0) + 1);
    }
  }

  return {
    controls: controlsRes?.data ?? null,
    lastRun: runRes?.data ?? null,
    discovered,
    eligible,
    contacted,
    delivered,
    clicked,
    registrations: stage("registered"),
    paid: stage("paid"),
    activated: stage("activated"),
    complianceBlocked: events.filter(
      (e) => e.stage === "quarantined" || e.stage === "compliance_blocked",
    ).length,
    duplicateSkipped: events.filter(
      (e) => e.stage === "excluded_history" || (e.reason_code ?? "").includes("duplicate"),
    ).length,
    failures: [...failureMap.entries()]
      .map(([reason, c]) => ({ reason, count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${warn && value === 0 ? "text-destructive" : ""}`}>
        {value}
      </div>
      {value === 0 && <div className="mt-1 text-xs text-muted-foreground">0 aujourd'hui</div>}
    </div>
  );
}

export function AutonomousRecruitmentPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["autonomous-recruitment-today"],
    queryFn: fetchMetrics,
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement du recrutement autonome…</div>;
  if (error) return <div className="text-destructive">Erreur: {(error as Error).message}</div>;
  if (!data) return null;

  const c = data.controls as any;
  const enabled = !!c?.global_enabled && !!c?.autonomous_enqueue_enabled;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Recrutement autonome — aujourd'hui</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"
          }`}
        >
          {enabled ? "Actif" : "Désactivé"}
        </span>
        <span className="text-xs text-muted-foreground">
          Dernier run :{" "}
          {data.lastRun?.started_at
            ? `${formatDistanceToNow(new Date(data.lastRun.started_at), { addSuffix: true, locale: fr })} (${data.lastRun.status ?? "?"})`
            : "aucun"}
        </span>
        <span className="text-xs text-muted-foreground">Prochain run : chaque heure (min. 17)</span>
        {c && (
          <span className="text-xs text-muted-foreground">
            Quotas : {c.max_daily_global}/j global · {c.max_daily_per_city_category}/j ville×catégorie ·
            cooldown {c.prospect_cooldown_days} j
          </span>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Découverts" value={data.discovered} />
        <Stat label="Éligibles (prêts à envoyer)" value={data.eligible} warn />
        <Stat label="Contactés" value={data.contacted} />
        <Stat label="Livrés" value={data.delivered} />
        <Stat label="Clics" value={data.clicked} />
        <Stat label="Inscriptions" value={data.registrations} />
        <Stat label="Paiements 1 $" value={data.paid} />
        <Stat label="Activations" value={data.activated} />
        <Stat label="Bloqués conformité" value={data.complianceBlocked} />
        <Stat label="Doublons / idempotence" value={data.duplicateSkipped} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-medium">Échecs exacts (aujourd'hui)</div>
        {data.failures.length === 0 ? (
          <div className="mt-2 text-sm text-muted-foreground">Aucun échec enregistré aujourd'hui.</div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {data.failures.map((f) => (
              <li key={f.reason} className="flex justify-between gap-4">
                <span className="text-muted-foreground truncate">{f.reason}</span>
                <span className="font-medium tabular-nums">{f.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
