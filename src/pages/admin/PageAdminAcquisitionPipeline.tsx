/**
 * /admin/acquisition-pipeline — Real-time acquisition funnel visibility.
 * Sources, funnel stats, coverage grid, rejection reasons, live event feed, prospect table.
 */
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, RefreshCw } from "lucide-react";
import {
  useAcquisitionSourceHealth,
  useFunnelDaily,
  useCoverage,
  useRejectionReasons,
  useRecentEvents,
  usePipelineProspects,
  useFirstDollarTracker,
} from "@/hooks/useAcquisitionFunnel";
import {
  ACQUISITION_REASONS,
  SOURCE_LABELS,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/config/acquisitionReasons";

const TARGET_CATEGORIES = ["toiture", "isolation", "plomberie", "peinture", "electricite", "renovation"];
const TARGET_CITIES = ["Montreal", "Laval", "Terrebonne", "Repentigny", "Longueuil", "Saint-Jerome", "Blainville", "Boisbriand"];

function StatTile({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "success" | "danger" | "warn" }) {
  const toneCls =
    tone === "success" ? "text-emerald-400" :
    tone === "danger" ? "text-rose-400" :
    tone === "warn" ? "text-amber-400" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}

function SourceHealthTable({ rows }: { rows: ReturnType<typeof useAcquisitionSourceHealth>["data"] }) {
  const ordered = rows ?? [];
  const statusClass: Record<string, string> = {
    HEALTHY: "text-emerald-300",
    DEGRADED: "text-amber-300",
    "SCRAPER DOWN": "text-rose-300",
    "FALLBACK RUNNING": "text-cyan-300",
  };
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-xs">
        <thead className="bg-white/[0.04] text-white/60">
          <tr>
            <th className="text-left px-3 py-2">Source</th>
            <th className="text-left px-3 py-2">Statut</th>
            <th className="text-left px-3 py-2">Dernier run</th>
            <th className="text-right px-3 py-2">Trouvées</th>
            <th className="text-left px-3 py-2">Erreur</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr key={row.source} className="border-t border-white/5">
              <td className="px-3 py-2 font-medium">{SOURCE_LABELS[row.source] ?? row.source}</td>
              <td className={`px-3 py-2 font-semibold ${statusClass[row.display_status] ?? "text-white/70"}`}>
                {row.display_status}
              </td>
              <td className="px-3 py-2 text-white/60">
                {row.last_run_at ? formatDistanceToNow(new Date(row.last_run_at), { addSuffix: true, locale: fr }) : "Jamais"}
              </td>
              <td className="px-3 py-2 text-right font-semibold">{row.is_down ? "—" : row.found_24h}</td>
              <td className="px-3 py-2 text-white/60 max-w-[260px] truncate" title={row.last_error_message ?? ""}>
                {row.last_error_message ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FirstDollarMini({ tracker }: { tracker: ReturnType<typeof useFirstDollarTracker>["data"] }) {
  const milestones = [
    ["First SMS Sent", tracker?.first_sms_sent_at],
    ["First Click", tracker?.first_click_at],
    ["First Activation", tracker?.first_activation_at],
    ["First $1 Payment", tracker?.first_paid_at],
    ["First Appointment", tracker?.first_appointment_at],
  ];
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">First Dollar Tracker</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {milestones.map(([label, at]) => (
          <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
            <div className={`mt-2 text-sm font-semibold ${at ? "text-emerald-300" : "text-amber-300"}`}>
              {at ? formatDistanceToNow(new Date(at as string), { addSuffix: true, locale: fr }) : "En attente"}
            </div>
          </div>
        ))}
      </div>
      {tracker?.next_missing_milestone && tracker.next_missing_milestone !== "Scale" && (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Blocage revenu actuel : {tracker.next_missing_milestone}
        </div>
      )}
    </section>
  );
}

export default function PageAdminAcquisitionPipeline() {
  const [filters, setFilters] = useState<{ stage?: string; source?: string; city?: string; category?: string; reason?: string }>({});

  const sourceHealth = useAcquisitionSourceHealth();
  const funnel = useFunnelDaily();
  const coverage = useCoverage();
  const rejections = useRejectionReasons();
  const events = useRecentEvents(50);
  const prospects = usePipelineProspects(filters);
  const firstDollar = useFirstDollarTracker();

  const stageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of funnel.data ?? []) m[r.stage] = (m[r.stage] ?? 0) + r.count;
    return m;
  }, [funnel.data]);

  const coverageMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of coverage.data ?? []) m.set(`${r.city}||${r.category}`, r.verified_count);
    return m;
  }, [coverage.data]);

  const totalVerified = (coverage.data ?? []).reduce((s, r) => s + r.verified_count, 0);
  const totalReady = (coverage.data ?? []).reduce((s, r) => s + r.ready_count, 0);
  const totalContacted = (coverage.data ?? []).reduce((s, r) => s + r.contacted_count, 0);

  const isLoading = funnel.isLoading && coverage.isLoading && events.isLoading;

  return (
    <div className="admin-theme min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl p-5 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Acquisition Pipeline</h1>
            <p className="text-sm text-white/50 mt-1">
              Funnel temps réel — trouvées → enrichies → validées → prêtes → contactées → activées.
            </p>
          </div>
          <button
            onClick={() => {
              funnel.refetch(); coverage.refetch(); rejections.refetch(); events.refetch(); prospects.refetch();
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/[0.08]"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Rafraîchir
          </button>
        </header>

        {/* Sources */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Santé des sources d'acquisition</h2>
          <SourceHealthTable rows={sourceHealth.data} />
        </section>

        <FirstDollarMini tracker={firstDollar.data} />

        {/* Funnel stats */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Statistiques du funnel</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Trouvées" value={stageCounts.scraped ?? 0} />
            <StatTile label="Enrichies" value={stageCounts.enriched ?? 0} />
            <StatTile label="Validées (total)" value={totalVerified} tone="success" />
            <StatTile label="Prêtes SMS/Email" value={totalReady} tone="warn" />
            <StatTile label="Contactées" value={totalContacted} />
            <StatTile label="Rejetées (24h)" value={stageCounts.rejected ?? 0} tone="danger" />
            <StatTile label="Doublons (24h)" value={stageCounts.duplicate ?? 0} />
            <StatTile label="Activées 1$" value={stageCounts.activated ?? 0} tone="success" />
          </div>
        </section>

        {/* Coverage grid */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">
            Couverture · vérifiées par ville × catégorie (cible : 100)
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.04] text-white/60">
                <tr>
                  <th className="text-left px-3 py-2 sticky left-0 bg-white/[0.04]">Ville</th>
                  {TARGET_CATEGORIES.map((c) => (
                    <th key={c} className="px-2 py-2 text-center capitalize">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TARGET_CITIES.map((city) => (
                  <tr key={city} className="border-t border-white/5">
                    <td className="px-3 py-2 sticky left-0 bg-[#050816] font-medium">{city}</td>
                    {TARGET_CATEGORIES.map((cat) => {
                      const n = coverageMap.get(`${city}||${cat}`) ?? 0;
                      const tone = n >= 100 ? "bg-emerald-500/20 text-emerald-300"
                        : n >= 20 ? "bg-amber-500/15 text-amber-300"
                        : "bg-rose-500/10 text-rose-300";
                      return (
                        <td key={cat} className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => setFilters({ city, category: cat })}
                            className={`w-full rounded-md px-2 py-1 ${tone} hover:opacity-90`}
                          >
                            {n}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Rejection reasons */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Top raisons de rejet (24h)</h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
            {(rejections.data ?? []).length === 0 && (
              <div className="p-4 text-sm text-white/40">Aucun rejet enregistré — le worker n'a pas encore produit d'événements.</div>
            )}
            {(rejections.data ?? []).map((r) => (
              <button
                key={r.reason_code}
                onClick={() => setFilters({ reason: r.reason_code })}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/[0.04]"
              >
                <span>{ACQUISITION_REASONS[r.reason_code] ?? r.reason_code}</span>
                <span className="text-rose-400 font-semibold">{r.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Filters bar */}
        {(filters.city || filters.category || filters.reason || filters.stage || filters.source) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/40">Filtres :</span>
            {Object.entries(filters).map(([k, v]) =>
              v ? (
                <span key={k} className="text-xs rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1">
                  {k}: {v}
                </span>
              ) : null,
            )}
            <button onClick={() => setFilters({})} className="text-xs text-white/60 underline">Réinitialiser</button>
          </div>
        )}

        {/* Prospect table */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">
            Entreprises ({prospects.data?.length ?? 0})
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.04] text-white/60">
                <tr>
                  <th className="text-left px-3 py-2">Entreprise</th>
                  <th className="text-left px-3 py-2">Ville</th>
                  <th className="text-left px-3 py-2">Catégorie</th>
                  <th className="text-left px-3 py-2">Tél</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-center px-3 py-2">Score</th>
                  <th className="text-left px-3 py-2">Statut</th>
                  <th className="text-left px-3 py-2">Dernière action</th>
                </tr>
              </thead>
              <tbody>
                {(prospects.data ?? []).length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-white/40">Aucune entreprise pour ces filtres.</td></tr>
                )}
                {(prospects.data ?? []).map((p) => {
                  const rejected = !!p.rejection_reason_code;
                  return (
                    <tr key={p.id} className={`border-t border-white/5 ${rejected ? "bg-rose-500/[0.04]" : ""}`}>
                      <td className="px-3 py-2 font-medium">{p.business_name}</td>
                      <td className="px-3 py-2 text-white/70">{p.city ?? "—"}</td>
                      <td className="px-3 py-2 text-white/70">{p.category ?? "—"}</td>
                      <td className="px-3 py-2 text-white/70">{p.phone_e164 ?? "—"}</td>
                      <td className="px-3 py-2 text-white/70 truncate max-w-[160px]">{p.email ?? "—"}</td>
                      <td className="px-3 py-2 text-white/60">{SOURCE_LABELS[p.source ?? "unknown"] ?? p.source}</td>
                      <td className="px-3 py-2 text-center">{p.data_quality_score ?? "—"}</td>
                      <td className="px-3 py-2">
                        {rejected ? (
                          <span title={p.rejection_reason_text ?? ""} className="text-rose-400">
                            {ACQUISITION_REASONS[p.rejection_reason_code!] ?? p.rejection_reason_code}
                          </span>
                        ) : (
                          <span className={STAGE_COLORS[p.outreach_status ?? "verified"] ?? "text-white/70"}>
                            {STAGE_LABELS[p.outreach_status ?? ""] ?? p.verification_status ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-white/50">
                        {p.last_action_at
                          ? formatDistanceToNow(new Date(p.last_action_at), { addSuffix: true, locale: fr })
                          : formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: fr })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live events timeline */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Événements récents (temps réel)</h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 max-h-96 overflow-y-auto">
            {(events.data ?? []).length === 0 && (
              <div className="p-4 text-sm text-white/40">Aucun événement encore. Lancer le worker autonome pour commencer.</div>
            )}
            {(events.data ?? []).map((e) => (
              <div key={e.id} className="px-4 py-2 text-xs flex items-center gap-3">
                <span className="text-white/40 shrink-0 w-24">
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: fr })}
                </span>
                <span className={`shrink-0 w-24 font-semibold ${STAGE_COLORS[e.stage] ?? "text-white/70"}`}>
                  {STAGE_LABELS[e.stage] ?? e.stage}
                </span>
                <span className="text-white/80 truncate flex-1">
                  {e.business_name ?? "—"}
                  <span className="text-white/40"> · {e.city ?? "?"} · {e.category ?? "?"}</span>
                </span>
                {e.reason_code && (
                  <span className="text-rose-400 shrink-0">
                    {ACQUISITION_REASONS[e.reason_code] ?? e.reason_code}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
