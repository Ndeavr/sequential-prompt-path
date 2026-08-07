/**
 * /admin/acquisition-pipeline — Real-time acquisition funnel visibility.
 * Sources, funnel stats, coverage grid, rejection reasons, live event feed, prospect table.
 * Adds a "Campagne ciblée" launcher (city × category) that drives the same
 * autonomous pipeline in scoped mode with a per-run 12-stage progression strip.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, RefreshCw, Play, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RevenueTimelinePanel } from "@/components/admin/acquisition/RevenueTimelinePanel";
import { AutonomousRecruitmentPanel } from "@/components/admin/acquisition/AutonomousRecruitmentPanel";

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

const CAMPAIGN_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "plumber", label: "Plomberie" },
  { value: "roofing", label: "Toiture" },
  { value: "electrician", label: "Électricité" },
  { value: "hvac", label: "CVAC" },
  { value: "isolation", label: "Isolation" },
  { value: "painting", label: "Peinture" },
  { value: "landscaping", label: "Paysagement" },
  { value: "renovation", label: "Rénovation" },
];

const STAGE_STRIP: Array<{ key: string; label: string; downstream?: boolean }> = [
  { key: "queued", label: "Queued" },
  { key: "promoted", label: "Promoted" },
  { key: "verification_reused", label: "Vérif. réutilisée" },
  { key: "verified", label: "Vérifié (Twilio)" },
  { key: "excluded_history", label: "Exclus (hist.)" },
  { key: "quarantined", label: "Quarantaine" },
  { key: "sms_attempted", label: "SMS tenté" },
  { key: "sms_sent", label: "SMS envoyé" },
  { key: "delivered", label: "Livré", downstream: true },
  { key: "clicked", label: "Cliqué", downstream: true },
  { key: "activated", label: "Activé", downstream: true },
  { key: "paid", label: "Payé 1 $", downstream: true },
];

type CampaignPreview = {
  ok: boolean;
  run_id?: string;
  mode?: string;
  city?: string | null;
  category?: string | null;
  counts?: Record<string, number>;
  prospects?: any[];
  prepared_prospect_ids?: string[];
  sms_result?: any;
  message?: string;
};



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
  const milestones: Array<[string, string | null | undefined]> = [
    ["1er SMS envoyé", tracker?.first_sms_sent_at],
    ["1re livraison confirmée", tracker?.first_delivery_at],
    ["1er clic (lié)", tracker?.first_click_at],
    ["1re inscription (liée)", tracker?.first_activation_at],
    ["1er paiement 1 $ (lié)", tracker?.first_paid_at],
    ["1re activation (liée)", tracker?.first_contractor_activation_at],
    ["1er rendez-vous (lié)", tracker?.first_appointment_at],
  ];

  const nextActionFr: Record<string, string> = {
    "First SMS Sent": "Envoyer le 1er SMS de ce lancement",
    "First Click": "Clic sur le lien d'activation",
    "First Registration": "Inscription contractor (compte créé)",
    "First $1 Payment": "Paiement Stripe de 1 $ CAD",
    "First Activation": "Activation contractor",
    "First Appointment": "Premier rendez-vous facturable",
  };
  const conversionNextAction =
    tracker?.next_missing_milestone && tracker.next_missing_milestone !== "Scale"
      ? nextActionFr[tracker.next_missing_milestone] ?? tracker.next_missing_milestone
      : null;

  const emptyLabel =
    tracker?.attribution_warning === "attribution_lead_missing"
      ? "Attribution manquante"
      : "En attente";

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="text-xs uppercase tracking-wide text-white/40">
          First Dollar Tracker · lancement en cours
          <span className="ml-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-emerald-200">
            Run épinglé
          </span>
        </h2>

        {tracker?.run_started_at && (
          <span className="text-[11px] text-white/50">
            Suivi depuis&nbsp;:{" "}
            {new Date(tracker.run_started_at).toLocaleString("fr-CA", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        )}
      </div>

      {tracker?.active_prospect_id && (
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-white/60">
          <span className="text-white/80 font-semibold">
            {tracker.active_business_name ?? "Prospect actif"}
          </span>
          {" · "}
          prospect&nbsp;<code className="text-white/70">{tracker.active_prospect_id.slice(0, 8)}</code>
          {tracker.active_contractor_lead_id && (
            <>
              {" · "}lead&nbsp;
              <code className="text-white/70">{tracker.active_contractor_lead_id.slice(0, 8)}</code>
            </>
          )}
          {tracker.active_provider_message_id && (
            <>
              {" · "}SID&nbsp;
              <code className="text-white/70">
                {tracker.active_provider_message_id.slice(0, 10)}…
              </code>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {milestones.map(([label, at]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
            <div className={`mt-2 text-sm font-semibold ${at ? "text-emerald-300" : "text-amber-300"}`}>
              {at
                ? formatDistanceToNow(new Date(at), { addSuffix: true, locale: fr })
                : emptyLabel}
            </div>
          </div>
        ))}
      </div>

      {conversionNextAction && (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <div className="font-semibold">Prochaine conversion attendue</div>
          <div className="opacity-90">Action opérateur&nbsp;: {conversionNextAction}.</div>
        </div>
      )}

      {tracker?.attribution_warning === "attribution_lead_missing" && (
        <div className="mt-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          <div className="font-semibold">Attribution incomplète</div>
          <div className="opacity-90">
            Aucun contractor lead n'est lié au prospect actif (ni par <code>source_prospect_id</code>,
            ni par téléphone E.164). Les jalons downstream restent « attribution manquante » jusqu'à
            réconciliation.
          </div>
        </div>
      )}

      {tracker?.telemetry_warning === "delivery_callback_missing" && (
        <div className="mt-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-200">
          <div className="font-semibold">Action technique&nbsp;: Réparer StatusCallback Twilio</div>
          <div className="opacity-90">
            Les SMS partent mais aucun callback de livraison n'est reçu. Ne bloque pas la conversion —
            corriger l'URL StatusCallback sur le Messaging Service Twilio pour restaurer la confirmation de livraison.
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// CampaignLauncher — city × category preview + live launch, with a per-run
// 12-stage strip fed from acquisition_pipeline_events tagged with run_id.
// Additive: does NOT alter existing monitoring below.
// ---------------------------------------------------------------------------
function CampaignLauncher() {
  const [city, setCity] = useState<string>("Laval");
  const [category, setCategory] = useState<string>("plumber");
  const [limit, setLimit] = useState<number>(25);
  const [busy, setBusy] = useState<"preview" | "launch" | null>(null);
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [launched, setLaunched] = useState<CampaignPreview | null>(null);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runId = launched?.run_id;

  const call = useCallback(async (dry_run: boolean) => {
    setBusy(dry_run ? "preview" : "launch");
    try {
      const { data, error } = await supabase.functions.invoke("acquisition-queue-worker", {
        body: { dry_run, campaign: { city, category, limit } },
      });
      if (error) throw error;
      const resp = data as CampaignPreview;
      if (dry_run) { setPreview(resp); setLaunched(null); setStageCounts({}); }
      else { setLaunched(resp); }
      return resp;
    } catch (e: any) {
      const errResp: CampaignPreview = { ok: false, message: e?.message ?? String(e) };
      if (dry_run) setPreview(errResp); else setLaunched(errResp);
      return errResp;
    } finally {
      setBusy(null);
    }
  }, [city, category, limit]);

  // Poll stage counts for the current run_id
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("acquisition_pipeline_events")
        .select("stage, metadata")
        .contains("metadata", { run_id: runId })
        .limit(500);
      if (cancelled) return;
      const m: Record<string, number> = {};
      for (const row of (data ?? []) as any[]) m[row.stage] = (m[row.stage] ?? 0) + 1;
      setStageCounts(m);
    };
    load();
    const t = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [runId]);

  const previewCounts = preview?.counts ?? {};
  const canLaunch = !!preview?.ok && ((previewCounts.potentially_sms_eligible ?? 0) + (previewCounts.verification_reused ?? 0)) > 0;

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Campagne ciblée · Ville × Catégorie</h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="text-xs">
            <span className="text-white/50">Ville</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-sm"
            >
              {TARGET_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="text-white/50">Catégorie</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-sm"
            >
              {CAMPAIGN_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="text-white/50">Limite (max 50)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              onClick={() => call(true)}
              disabled={busy !== null}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs flex items-center justify-center gap-2 hover:bg-white/[0.09] disabled:opacity-50"
            >
              {busy === "preview" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Aperçu
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!canLaunch || busy !== null}
              className="flex-1 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/25 disabled:opacity-40"
            >
              {busy === "launch" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Lancer
            </button>
          </div>
        </div>

        {preview && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wide text-white/50">Aperçu (aucun envoi)</span>
              {preview.run_id && <span className="font-mono text-[10px] text-white/40">run {preview.run_id.slice(0, 8)}</span>}
            </div>
            {!preview.ok && (
              <div className="text-rose-300">Erreur : {preview.message}</div>
            )}
            {preview.ok && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(previewCounts).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-1.5">
                    <div className="text-[10px] uppercase text-white/40">{k}</div>
                    <div className="text-sm font-semibold">{v}</div>
                  </div>
                ))}
              </div>
            )}
            {preview.ok && Array.isArray(preview.prospects) && preview.prospects.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-white/60">Voir {preview.prospects.length} prospects</summary>
                <div className="mt-2 divide-y divide-white/5">
                  {preview.prospects.map((p: any, i: number) => (
                    <div key={i} className="py-1.5 flex items-center gap-2 text-[11px]">
                      <span className="flex-1 truncate">{p.business_name} · {p.city ?? "?"} · {p.category ?? "?"}</span>
                      <span className="text-white/50 font-mono">{p.phone_e164_masked ?? ""}</span>
                      <span className={
                        p.bucket === "verification_reused" ? "text-emerald-300"
                        : p.bucket === "historically_excluded" ? "text-rose-300"
                        : "text-amber-300"
                      }>
                        {p.bucket}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {confirmOpen && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs space-y-2">
            <div className="font-semibold text-amber-200">Confirmer le lancement réel</div>
            <div className="text-amber-100/80">
              Cette action déclenche la vérification Twilio, les mises à jour de statut et l'envoi SMS
              pour les prospects préparés dans ce run. Les destinations déjà contactées sont exclues.
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => { setConfirmOpen(false); await call(false); }}
                className="rounded-lg bg-emerald-500/25 border border-emerald-400/40 px-3 py-1.5 hover:bg-emerald-500/40"
              >
                Confirmer et lancer
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg bg-white/[0.06] border border-white/10 px-3 py-1.5 hover:bg-white/[0.1]"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {launched && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wide text-white/50">Run en cours · {launched.mode} · {launched.city} × {launched.category}</span>
              {launched.run_id && <span className="font-mono text-[10px] text-white/40">run {launched.run_id.slice(0, 8)}</span>}
            </div>
            {!launched.ok && <div className="text-rose-300">Erreur : {launched.message}</div>}

            {/* 12-stage strip */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {STAGE_STRIP.map((s) => {
                const n = stageCounts[s.key] ?? 0;
                let cls = "bg-white/[0.03] border-white/10 text-white/50";
                let state = s.downstream ? "waiting_downstream" : "zero_eligible";
                if (n > 0) {
                  state = "completed";
                  if (s.key === "excluded_history" || s.key === "quarantined" || s.key === "failed") {
                    cls = "bg-rose-500/10 border-rose-400/30 text-rose-200";
                  } else if (s.downstream) {
                    cls = "bg-emerald-500/15 border-emerald-400/30 text-emerald-200";
                  } else {
                    cls = "bg-emerald-500/10 border-emerald-400/30 text-emerald-200";
                  }
                } else if (s.downstream) {
                  cls = "bg-amber-500/5 border-amber-400/20 text-amber-200/70";
                }
                return (
                  <div key={s.key} className={`rounded-lg border px-2 py-1.5 ${cls}`} title={state}>
                    <div className="text-[10px] uppercase opacity-80">{s.label}</div>
                    <div className="text-sm font-semibold">{n}</div>
                  </div>
                );
              })}
            </div>

            {launched.counts && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(launched.counts).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-1.5">
                    <div className="text-[10px] uppercase text-white/40">{k}</div>
                    <div className="text-sm font-semibold">{v}</div>
                  </div>
                ))}
              </div>
            )}

            {launched.sms_result && (
              <div className="text-white/60">
                SMS: {launched.sms_result.sent ?? 0} envoyé(s) · {launched.sms_result.processed ?? 0} traité(s)
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DeterministicTargetingPanel — target a single contractor by ID / exact name /
// phone / email. Bypasses fair-queue scoring and category/city filters.
// Same worker endpoint; runs in mode="deterministic".
// ---------------------------------------------------------------------------
type TargetFilter = "business_name_exact" | "business_name_ilike" | "phone_e164" | "email" | "contractor_lead_id";

function DeterministicTargetingPanel() {
  const [filter, setFilter] = useState<TargetFilter>("business_name_ilike");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<"preview" | "launch" | null>(null);
  const [result, setResult] = useState<CampaignPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const call = useCallback(async (dry_run: boolean) => {
    if (!value.trim()) return;
    setBusy(dry_run ? "preview" : "launch");
    try {
      const target: Record<string, string> = { [filter]: value.trim() };
      const { data, error } = await supabase.functions.invoke("acquisition-queue-worker", {
        body: { dry_run, target, limit: 5 },
      });
      if (error) throw error;
      setResult(data as CampaignPreview);
    } catch (e: any) {
      setResult({ ok: false, message: e?.message ?? String(e) });
    } finally {
      setBusy(null);
    }
  }, [filter, value]);

  const canLaunch = !!result?.ok && ((result.counts?.potentially_sms_eligible ?? 0) + (result.counts?.verification_reused ?? 0)) > 0;

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Ciblage déterministe · Un contractor précis</h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr_auto_auto] gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TargetFilter)}
            className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-sm"
          >
            <option value="business_name_ilike">Nom entreprise (contient)</option>
            <option value="business_name_exact">Nom entreprise (exact)</option>
            <option value="phone_e164">Téléphone (E.164)</option>
            <option value="email">Email</option>
            <option value="contractor_lead_id">contractor_leads.id</option>
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              filter === "phone_e164" ? "+15145714880"
              : filter === "email" ? "info@example.ca"
              : filter === "contractor_lead_id" ? "uuid"
              : "Plomberie Expert"
            }
            className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-sm"
          />
          <button
            onClick={() => call(true)}
            disabled={busy !== null || !value.trim()}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/[0.09] disabled:opacity-50"
          >
            {busy === "preview" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Aperçu
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!canLaunch || busy !== null}
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs flex items-center gap-2 hover:bg-emerald-500/25 disabled:opacity-40"
          >
            {busy === "launch" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Lancer
          </button>
        </div>

        {result && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs space-y-2">
            {!result.ok && <div className="text-rose-300">Erreur : {result.message}</div>}
            {result.ok && (
              <>
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wide text-white/50">Résultat · mode {result.mode}</span>
                  {result.run_id && <span className="font-mono text-[10px] text-white/40">run {result.run_id.slice(0, 8)}</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(result.counts ?? {}).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-1.5">
                      <div className="text-[10px] uppercase text-white/40">{k}</div>
                      <div className="text-sm font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
                {Array.isArray(result.prospects) && result.prospects.length > 0 && (
                  <div className="mt-2 divide-y divide-white/5">
                    {result.prospects.map((p: any, i: number) => (
                      <div key={i} className="py-1.5 text-[11px] flex items-center gap-2">
                        <span className="flex-1 truncate">{p.business_name} · {p.city ?? "?"} · {p.category ?? "?"}</span>
                        <span className="text-white/50 font-mono">{p.phone_e164_masked ?? ""}</span>
                        <span className="text-amber-300">{p.bucket}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.sms_result && (
                  <div className="text-white/60">
                    SMS: {result.sms_result.sent_sms ?? result.sms_result.sent ?? 0} · Email fallback: {result.sms_result.sent_email ?? 0} · traités: {result.sms_result.processed ?? 0}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {confirmOpen && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs space-y-2">
            <div className="font-semibold text-amber-200">Confirmer envoi réel</div>
            <div className="text-amber-100/80">
              Cette action vérifie le numéro, envoie le SMS et bascule automatiquement sur email si le SMS échoue.
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => { setConfirmOpen(false); await call(false); }}
                className="rounded-lg bg-emerald-500/25 border border-emerald-400/40 px-3 py-1.5 hover:bg-emerald-500/40"
              >
                Confirmer et envoyer
              </button>
              <button onClick={() => setConfirmOpen(false)} className="rounded-lg bg-white/[0.06] border border-white/10 px-3 py-1.5 hover:bg-white/[0.1]">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ReconciliationTable — searchable per-contractor delivery outcome view.
// Reads verified_contractor_prospects directly; no writes.
// ---------------------------------------------------------------------------
type ReconRow = {
  id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  phone_e164: string | null;
  email: string | null;
  channel_used: string | null;
  delivery_status: string | null;
  sms_provider_message_id: string | null;
  outreach_twilio_sid: string | null;
  sms_error_code: string | null;
  sms_error_message: string | null;
  email_provider_message_id: string | null;
  email_error_message: string | null;
  fallback_reason: string | null;
  fallback_timestamp: string | null;
  retry_count: number | null;
  last_attempt_at: string | null;
  outreach_status: string | null;
  outreach_sent_at: string | null;
};

function ReconciliationTable() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ReconRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const cols = "id,business_name,city,category,phone_e164,email,channel_used,delivery_status,sms_provider_message_id,outreach_twilio_sid,sms_error_code,sms_error_message,email_provider_message_id,email_error_message,fallback_reason,fallback_timestamp,retry_count,last_attempt_at,outreach_status,outreach_sent_at";
      let query = supabase
        .from("verified_contractor_prospects")
        .select(cols)
        .not("last_attempt_at", "is", null)
        .order("last_attempt_at", { ascending: false })
        .limit(50);
      const s = search.trim();
      if (s) {
        const like = `%${s}%`;
        query = query.or(`business_name.ilike.${like},phone_e164.ilike.${like},email.ilike.${like}`);
      }
      const { data } = await query;
      setRows((data ?? []) as ReconRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xs uppercase tracking-wide text-white/40 flex-1">Réconciliation multicanal · dernières tentatives</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(q); }}
          placeholder="Nom, téléphone, email"
          className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-1.5 text-xs w-64"
        />
        <button
          onClick={() => load(q)}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs hover:bg-white/[0.09]"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Rechercher"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-white/[0.04] text-white/60">
            <tr>
              <th className="text-left px-3 py-2">Entreprise</th>
              <th className="text-left px-3 py-2">Canal</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Provider ID</th>
              <th className="text-left px-3 py-2">Fallback</th>
              <th className="text-left px-3 py-2">Erreurs</th>
              <th className="text-center px-3 py-2">Retry</th>
              <th className="text-left px-3 py-2">Dernière tentative</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-white/40">
                {loading ? "Chargement…" : "Aucune tentative enregistrée."}
              </td></tr>
            )}
            {rows.map((r) => {
              const providerId = r.channel_used === "sms"
                ? (r.sms_provider_message_id ?? r.outreach_twilio_sid ?? "—")
                : r.channel_used === "email"
                  ? (r.email_provider_message_id ?? "—")
                  : "—";
              const err = r.sms_error_code || r.sms_error_message || r.email_error_message
                ? `${r.sms_error_code ? `[${r.sms_error_code}] ` : ""}${r.sms_error_message ?? ""}${r.email_error_message ? ` · email: ${r.email_error_message}` : ""}`
                : "—";
              const statusCls = r.delivery_status === "sent" || r.delivery_status === "sent_email"
                ? "text-emerald-300"
                : r.delivery_status === "failed" ? "text-rose-300" : "text-white/60";
              return (
                <tr key={r.id} className="border-t border-white/5 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.business_name ?? "—"}</div>
                    <div className="text-[10px] text-white/50">{r.city ?? "?"} · {r.category ?? "?"}</div>
                    <div className="text-[10px] text-white/40 font-mono">{r.phone_e164 ?? r.email ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2 text-white/70">{r.channel_used ?? "—"}</td>
                  <td className={`px-3 py-2 font-semibold ${statusCls}`}>{r.delivery_status ?? r.outreach_status ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-white/60 max-w-[180px] truncate" title={providerId}>{providerId}</td>
                  <td className="px-3 py-2 text-white/60">
                    {r.fallback_reason ?? "—"}
                    {r.fallback_timestamp && (
                      <div className="text-[10px] text-white/40">
                        {formatDistanceToNow(new Date(r.fallback_timestamp), { addSuffix: true, locale: fr })}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-rose-300 max-w-[220px] truncate" title={err}>{err}</td>
                  <td className="px-3 py-2 text-center text-white/70">{r.retry_count ?? 0}</td>
                  <td className="px-3 py-2 text-white/50">
                    {r.last_attempt_at
                      ? formatDistanceToNow(new Date(r.last_attempt_at), { addSuffix: true, locale: fr })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

        <AutonomousRecruitmentPanel />

        <FirstDollarMini tracker={firstDollar.data} />


        <CampaignLauncher />

        <RevenueTimelinePanel initialQuery="Electro Pompe" />

        <DeterministicTargetingPanel />

        <ReconciliationTable />


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
