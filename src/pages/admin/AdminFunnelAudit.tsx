/**
 * UNPRO — Audit du funnel d'acquisition (30 derniers jours, lecture seule).
 * Aucune écriture. Aucun nouveau design global. Diagnostic uniquement.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFunnelAudit, type FunnelStage } from "@/hooks/useFunnelAudit";
import { AlertTriangle, RefreshCw, ArrowDown, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

function relTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "—";
  }
}

function StageRow({ s, index }: { s: FunnelStage; index: number }) {
  const drop = s.drop_from_previous_pct ?? 0;
  const isBigDrop = index > 0 && drop >= 50;
  return (
    <tr className={isBigDrop ? "bg-red-500/5" : ""}>
      <td className="py-3 pr-4 text-sm text-white/40 tabular-nums">{String(index + 1).padStart(2, "0")}</td>
      <td className="py-3 pr-4">
        <div className="text-sm font-medium text-white/90">{s.label}</div>
        <div className="text-[11px] text-white/40">{s.key}</div>
      </td>
      <td className="py-3 pr-4 text-right text-sm font-semibold text-white tabular-nums">{s.count.toLocaleString("fr-CA")}</td>
      <td className="py-3 pr-4 text-right text-xs tabular-nums text-white/70">
        {s.conversion_from_previous_pct == null ? "—" : `${s.conversion_from_previous_pct}%`}
      </td>
      <td className="py-3 pr-4 text-right text-xs tabular-nums">
        {index === 0 || s.drop_from_previous_pct == null ? (
          <span className="text-white/40">—</span>
        ) : (
          <span className={isBigDrop ? "text-red-300" : drop > 0 ? "text-amber-300" : "text-emerald-300"}>
            {drop > 0 ? `-${drop}%` : `+${Math.abs(drop)}%`}
          </span>
        )}
      </td>
      <td className="py-3 pr-4 text-xs text-white/60">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {relTime(s.last_occurrence_at)}
        </span>
      </td>
      <td className="py-3 text-xs text-white/70">
        {s.top_error ? (
          <span title={s.top_error.message}>
            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-200">{s.top_error.code}</span>
            <span className="ml-1 text-white/40">×{s.top_error.count}</span>
          </span>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </td>
    </tr>
  );
}

export default function AdminFunnelAudit() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refetch, isFetching } = useFunnelAudit(days);

  return (
    <AdminLayout>
      <PageHeader
        title="Audit du funnel d'acquisition"
        description="Chiffres réels des 30 derniers jours — scraping → paiement → activation. Lecture seule."
      />

      <div className="mb-4 flex items-center gap-2">
        {[7, 30, 90].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? "default" : "outline"}
            onClick={() => setDays(d)}
          >
            {d}j
          </Button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {isLoading && <LoadingState />}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-4 text-sm text-red-200">
            Erreur : {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {data.biggest_dropoff && (
            <Card className="mb-6 border-red-500/40 bg-red-500/10">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <div>
                  <div className="text-sm font-semibold text-red-100">
                    Plus grosse perte : <span className="underline">{data.biggest_dropoff.label}</span> — {data.biggest_dropoff.drop_pct}% de chute
                  </div>
                  <div className="text-xs text-red-200/80">
                    {data.biggest_dropoff.from.toLocaleString("fr-CA")} → {data.biggest_dropoff.to.toLocaleString("fr-CA")}. C'est ici que le premier entrepreneur payé est probablement bloqué.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-white/60">Leads scrapés ({data.window_days}j)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{data.total_leads_scraped.toLocaleString("fr-CA")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-white/60">SMS 7 derniers jours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{data.sms_7d_summary.total.toLocaleString("fr-CA")}</div>
                <div className="mt-1 text-[11px] text-white/60">
                  livrés {data.sms_7d_summary.delivered} · envoyés {data.sms_7d_summary.sent} ·{" "}
                  <span className="text-red-300">échoués {data.sms_7d_summary.failed + data.sms_7d_summary.undelivered}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-white/60">Couverture préremplissage inscription</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{data.prefill_coverage.pct}%</div>
                <div className="mt-1 text-[11px] text-white/60">
                  {data.prefill_coverage.prefilled}/{data.prefill_coverage.sampled} inscriptions récentes avec données pré-remplies (nom, tel, catégorie, ville)
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowDown className="h-4 w-4" />
                Funnel étape par étape ({data.window_days}j)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Étape</th>
                      <th className="py-2 pr-4 text-right">Nombre</th>
                      <th className="py-2 pr-4 text-right">Conv. précédent</th>
                      <th className="py-2 pr-4 text-right">Drop-off</th>
                      <th className="py-2 pr-4">Dernière occurrence</th>
                      <th className="py-2">Erreur dominante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.stages.map((s, i) => (
                      <StageRow key={s.key} s={s} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-[11px] text-white/40">
                Généré {relTime(data.generated_at)}. Rafraîchissement automatique toutes les 60s.
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
