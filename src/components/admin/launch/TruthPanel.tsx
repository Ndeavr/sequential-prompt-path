/**
 * TruthPanel — Top of /admin/launch-war-room.
 * Six revenue-truth tiles + red banner if 0 activations + funnel waterfall.
 */
import { Card, CardContent } from "@/components/ui/card";
import { AlertOctagon, DollarSign, TrendingUp, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface FunnelRow {
  total_leads: number;
  stage_discovered: number;
  stage_enriched: number;
  stage_messaged: number;
  stage_delivered: number;
  stage_opened_or_replied: number;
  stage_checkout_started: number;
  stage_paid: number;
  stage_activated: number;
  stage_blocked: number;
  stage_failed: number;
  checkouts_today: number;
  payments_today: number;
  activations_today: number;
  mrr_today_cents: number;
  mrr_total_cents: number;
  pipeline_value_cents: number;
  last_activation_at: string | null;
}

function fmtCents(c?: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
    .format((c ?? 0) / 100);
}

function daysSince(iso: string | null): string {
  if (!iso) return "∞";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days === 0 ? "aujourd'hui" : `${days}j`;
}

export function TruthPanel({
  funnel,
  pendingCheckouts,
  oldestPendingAgeMin,
}: {
  funnel: FunnelRow | null;
  pendingCheckouts: number;
  oldestPendingAgeMin: number | null;
}) {
  const activated = funnel?.stage_activated ?? 0;
  const noRevenue = activated === 0;

  return (
    <div className="space-y-4">
      {noRevenue && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertOctagon className="w-6 h-6 text-red-300 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-base font-semibold text-red-100">
              Aucun revenu généré.
            </div>
            <div className="text-sm text-red-200/90 mt-0.5">
              Le moteur d'acquisition est incomplet — enquêter sur le pipeline ci-dessous.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile
          label="Contractors activés"
          value={String(activated)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone={activated >= 1 ? "ok" : "danger"}
        />
        <Tile
          label="MRR aujourd'hui"
          value={fmtCents(funnel?.mrr_today_cents)}
          icon={<DollarSign className="w-4 h-4" />}
          tone={(funnel?.mrr_today_cents ?? 0) > 0 ? "ok" : "neutral"}
        />
        <Tile
          label="Valeur pipeline"
          value={fmtCents(funnel?.pipeline_value_cents)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <Tile
          label="Paiements en attente"
          value={String(pendingCheckouts)}
          icon={<Clock className="w-4 h-4" />}
          tone={pendingCheckouts > 0 ? "warn" : "neutral"}
        />
        <Tile
          label="Prochaine activation"
          value={
            oldestPendingAgeMin == null
              ? "—"
              : oldestPendingAgeMin < 60
                ? `~${oldestPendingAgeMin}min`
                : `~${Math.floor(oldestPendingAgeMin / 60)}h`
          }
          icon={<Clock className="w-4 h-4" />}
        />
        <Tile
          label="Jours depuis dernière"
          value={daysSince(funnel?.last_activation_at ?? null)}
          icon={<AlertTriangle className="w-4 h-4" />}
          tone={funnel?.last_activation_at ? "neutral" : "danger"}
        />
      </div>

      {/* Funnel waterfall */}
      <FunnelWaterfall funnel={funnel} />
    </div>
  );
}

function Tile({
  label, value, icon, tone = "neutral",
}: {
  label: string; value: string; icon?: React.ReactNode;
  tone?: "ok" | "warn" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "ok" ? "border-emerald-500/40 bg-emerald-500/5" :
    tone === "warn" ? "border-amber-500/40 bg-amber-500/5" :
    tone === "danger" ? "border-red-500/40 bg-red-500/5" :
    "border-border/40";
  const valueClass =
    tone === "ok" ? "text-emerald-300" :
    tone === "warn" ? "text-amber-300" :
    tone === "danger" ? "text-red-300" : "";
  return (
    <Card className={toneClass}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-readable-muted">
          {icon} {label}
        </div>
        <div className={`text-xl font-bold tabular-nums mt-1 ${valueClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

const STEPS: { key: keyof FunnelRow; label: string }[] = [
  { key: "stage_discovered", label: "Découverts" },
  { key: "stage_enriched", label: "Enrichis" },
  { key: "stage_messaged", label: "Messagés" },
  { key: "stage_delivered", label: "Livrés" },
  { key: "stage_opened_or_replied", label: "Engagés" },
  { key: "stage_checkout_started", label: "Checkout" },
  { key: "stage_paid", label: "Payés" },
  { key: "stage_activated", label: "Activés" },
];

function FunnelWaterfall({ funnel }: { funnel: FunnelRow | null }) {
  if (!funnel) return null;
  const max = Math.max(1, ...STEPS.map(s => Number(funnel[s.key] ?? 0)));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-readable-muted mb-3">
          Entonnoir d'acquisition
        </div>
        <div className="space-y-1.5">
          {STEPS.map((s, i) => {
            const v = Number(funnel[s.key] ?? 0);
            const prev = i > 0 ? Number(funnel[STEPS[i - 1].key] ?? 0) : v;
            const conv = prev > 0 ? Math.round((v / prev) * 100) : 100;
            const heavyDrop = i > 0 && prev > 0 && conv < 20;
            const width = Math.max(4, Math.round((v / max) * 100));
            return (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <div className="w-24 text-readable-muted shrink-0">{s.label}</div>
                <div className="flex-1 h-6 bg-muted/10 rounded overflow-hidden relative">
                  <div
                    className={`h-full ${heavyDrop ? "bg-red-500/40" : v > 0 ? "bg-emerald-500/40" : "bg-muted/20"} transition-all`}
                    style={{ width: `${width}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2 font-mono tabular-nums text-readable-body">
                    {v}
                  </div>
                </div>
                <div className={`w-14 text-right tabular-nums shrink-0 ${heavyDrop ? "text-red-300 font-semibold" : "text-readable-muted"}`}>
                  {i === 0 ? "—" : `${conv}%`}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
