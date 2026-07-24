/**
 * UNPRO — Audit du funnel d'acquisition (30 derniers jours, lecture seule).
 * Aucune écriture. Aucun nouveau design global. Diagnostic uniquement.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFunnelAudit, repairCanaryLandings, type FunnelStage, type CanaryPreviewLead, type ReadinessStatus } from "@/hooks/useFunnelAudit";
import { toast } from "sonner";
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

const READINESS_LABELS: Record<ReadinessStatus, { emoji: string; label: string; tone: string }> = {
  ready: { emoji: "🟢", label: "Prêt à envoyer", tone: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" },
  missing_landing: { emoji: "🟠", label: "Landing manquante", tone: "bg-amber-500/15 text-amber-200 border-amber-400/30" },
  missing_city: { emoji: "🟠", label: "Ville manquante", tone: "bg-amber-500/15 text-amber-200 border-amber-400/30" },
  missing_category: { emoji: "🟠", label: "Catégorie manquante", tone: "bg-amber-500/15 text-amber-200 border-amber-400/30" },
  missing_phone: { emoji: "🔴", label: "Téléphone manquant", tone: "bg-red-500/15 text-red-200 border-red-400/30" },
  casl_pending: { emoji: "🔴", label: "CASL en attente", tone: "bg-red-500/15 text-red-200 border-red-400/30" },
};

function fieldValue(v: string | null | undefined, kind: "auto" | "url" = "auto"): { text: string; tone: string; title?: string } {
  if (v && v.length) {
    if (kind === "url") return { text: v, tone: "text-emerald-200", title: v };
    return { text: v, tone: "text-white/85" };
  }
  return { text: "Manquant", tone: "text-white/40 italic" };
}

function ReadinessChip({ lead }: { lead: CanaryPreviewLead }) {
  const r = lead.readiness;
  if (!r) return <span className="text-white/30 text-xs">—</span>;
  const meta = READINESS_LABELS[r.status];
  return (
    <div className="mb-2">
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.tone}`}>
        {meta.emoji} {meta.label}
      </span>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-white/60">
        {(["phone", "casl", "city", "category", "landing"] as const).map((k) => (
          <span key={k} className={r.checks[k] ? "text-emerald-300" : "text-red-300/80"}>
            {r.checks[k] ? "✔" : "✗"} {k}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminFunnelAudit() {
  const [days, setDays] = useState(30);
  const [previewOn, setPreviewOn] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useFunnelAudit(days);
  const {
    data: canaryData,
    isFetching: canaryFetching,
    error: canaryError,
    refetch: refetchCanary,
  } = useFunnelAudit(days, { canary: previewOn, canaryLimit: 3 });

  const readiness = canaryData?.canary_readiness ?? null;

  const handleRepair = async () => {
    try {
      setRepairing(true);
      const res = await repairCanaryLandings(10);
      if (res.error) throw new Error(res.error);
      toast.success(`Landings créées : ${res.created} · ignorées : ${res.skipped}`);
      await refetchCanary();
    } catch (e) {
      toast.error(`Auto-réparation échouée : ${(e as Error).message}`);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Audit du funnel d'acquisition"
        description="Chiffres réels des 30 derniers jours — scraping → paiement → activation. Lecture seule."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
        <div className="hidden flex-1 sm:block" />
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
        <Button
          size="sm"
          variant={previewOn ? "outline" : "default"}
          className="w-full sm:w-auto"
          onClick={() => {
            if (previewOn) {
              setPreviewOn(false);
            } else {
              setPreviewOn(true);
              setTimeout(() => refetchCanary(), 0);
            }
          }}
          disabled={canaryFetching}
        >
          {previewOn ? "Masquer l'aperçu" : "Aperçu 3 prospects réels"}
        </Button>
        {previewOn && (
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleRepair}
            disabled={repairing || canaryFetching}
          >
            {repairing ? "Réparation…" : "Auto-réparer landings (max 10)"}
          </Button>
        )}
      </div>

      {isLoading && <LoadingState />}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-4 text-sm text-red-200">
            Erreur : {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {previewOn && readiness && !readiness.error && (
        <Card className="mb-4 border-white/10 bg-black/20">
          <CardContent className="grid grid-cols-2 gap-3 py-4 text-center sm:grid-cols-6">
            {[
              { label: "Éligibles", value: readiness.eligible, tone: "text-white/90" },
              { label: "🟢 Prêts", value: readiness.ready_now, tone: "text-emerald-300" },
              { label: "Landing manquant", value: readiness.missing_landing, tone: "text-amber-300" },
              { label: "Ville manquante", value: readiness.missing_city, tone: "text-amber-300" },
              { label: "Catégorie manquante", value: readiness.missing_category, tone: "text-amber-300" },
              { label: "Téléphone manquant", value: readiness.missing_phone, tone: "text-red-300" },
            ].map((s) => (
              <div key={s.label}>
                <div className={`text-lg font-bold tabular-nums ${s.tone}`}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-white/50">{s.label}</div>
              </div>
            ))}
          </CardContent>
          <CardContent className="border-t border-white/5 py-2 text-center text-[11px] text-white/60">
            Taux prêt : <span className="font-semibold text-emerald-300">{readiness.ready_pct}%</span> sur {readiness.eligible} candidats analysés
          </CardContent>
        </Card>
      )}

      {previewOn && (
        <Card className="mb-6 border-amber-400/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-medium">
              Aperçu canary (lecture seule)
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                NO SMS was sent
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canaryFetching && <div className="text-xs text-white/60">Chargement de l'aperçu…</div>}
            {canaryError && (
              <div className="text-xs text-red-300">Erreur : {(canaryError as Error).message}</div>
            )}
            {!canaryFetching && canaryData?.canary_preview && (
              <>
                <div className="mb-3 text-[11px] text-white/60">
                  {canaryData.canary_preview.disclaimer ?? "NO SMS was sent."} · prêts :{" "}
                  <span className="font-semibold text-emerald-300">
                    {canaryData.canary_preview.would_send_count ?? 0}
                  </span>{" "}
                  / {canaryData.canary_preview.would_send?.length ?? 0}
                </div>
                {canaryData.canary_preview.error && (
                  <div className="mb-2 text-xs text-red-300">
                    {canaryData.canary_preview.error}
                  </div>
                )}
                {(canaryData.canary_preview.would_send ?? []).length === 0 ? (
                  <div className="text-xs text-white/50">Aucun prospect éligible.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {canaryData.canary_preview.would_send.map((lead) => {
                      const city = fieldValue(lead.city);
                      const category = fieldValue(lead.category);
                      const phone = fieldValue(lead.phone);
                      const casl = fieldValue(lead.evidence_source_url, "url");
                      const landing = lead.landing_url
                        ? { text: lead.landing_url, tone: "text-emerald-200", title: lead.landing_url }
                        : { text: "Génération requise", tone: "text-amber-300 italic" };
                      return (
                        <div
                          key={lead.lead_id}
                          className="rounded-md border border-white/10 bg-black/20 p-3 text-xs"
                        >
                          <div className="mb-1 text-sm font-semibold text-white/90">
                            {lead.business ?? "Sans nom"}
                          </div>
                          <ReadinessChip lead={lead} />
                          <dl className="space-y-1 text-white/70">
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/40">Ville</dt>
                              <dd className={`text-right ${city.tone}`}>{city.text}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/40">Catégorie</dt>
                              <dd className={`text-right ${category.tone}`}>{category.text}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/40">Téléphone</dt>
                              <dd className={`text-right tabular-nums ${phone.tone}`}>{phone.text}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/40">CASL</dt>
                              <dd className={`max-w-[60%] truncate text-right ${casl.tone}`} title={casl.title}>
                                {casl.text}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/40">Méthode</dt>
                              <dd className="text-right">{lead.verification_method ?? "Vérifié"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/40">Récupéré</dt>
                              <dd className="text-right">{relTime(lead.evidence_retrieved_at)}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/40">Landing</dt>
                              <dd className={`max-w-[60%] truncate text-right ${landing.tone}`} title={landing.title}>
                                {landing.text}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
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
