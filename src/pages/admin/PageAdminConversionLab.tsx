/**
 * /admin/conversion-lab — Cockpit de conversion sur DONNÉES DE PRODUCTION.
 *
 * Deux lectures :
 *  1. Le goulot d'étranglement canonique (v_activation_bottleneck) — la première
 *     transition faible est identifiée automatiquement, jamais devinée.
 *  2. Le laboratoire de variantes (v_conversion_lab) — performance par variante
 *     de message / landing / profil, cohorte ville et métier.
 *
 * Garde-fou : aucune variante n'est déclarée gagnante sous l'échantillon minimum.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const MIN_SAMPLE = 30;

interface BottleneckRow {
  step_order: number;
  transition: string;
  from_count: number;
  to_count: number;
  rate_pct: number | null;
}

interface LabRow {
  message_variant: string;
  landing_variant: string;
  profile_variant: string;
  city: string | null;
  trade: string | null;
  cohort_size: number;
  sent: number;
  delivered: number;
  clicked: number;
  landing_viewed: number;
  landing_engaged: number;
  profile_viewed: number;
  cta_clicked: number;
  checkout_created: number;
  paid: number;
  goals_completed: number;
  plan_accepted: number;
}

type GroupKey = "landing_variant" | "message_variant" | "profile_variant" | "city" | "trade";

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "landing_variant", label: "Variante landing" },
  { key: "message_variant", label: "Variante message" },
  { key: "profile_variant", label: "Variante profil" },
  { key: "city", label: "Ville" },
  { key: "trade", label: "Métier" },
];

const NUMERIC: (keyof LabRow)[] = [
  "cohort_size", "sent", "delivered", "clicked", "landing_viewed",
  "landing_engaged", "profile_viewed", "cta_clicked", "checkout_created",
  "paid", "goals_completed", "plan_accepted",
];

function pct(num: number, den: number): string {
  if (!den) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
}

export default function PageAdminConversionLab() {
  const [bottleneck, setBottleneck] = useState<BottleneckRow[]>([]);
  const [rows, setRows] = useState<LabRow[]>([]);
  const [group, setGroup] = useState<GroupKey>("landing_variant");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const [b, l] = await Promise.all([
      supabase.from("v_activation_bottleneck").select("*").order("step_order"),
      supabase.from("v_conversion_lab").select("*").limit(2000),
    ]);
    if (b.error || l.error) {
      setError(b.error?.message ?? l.error?.message ?? "Erreur de chargement");
    } else {
      setBottleneck((b.data ?? []) as unknown as BottleneckRow[]);
      setRows((l.data ?? []) as unknown as LabRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  // Première transition matériellement faible (échantillon suffisant + taux bas).
  const firstWeak = useMemo(() => {
    return bottleneck.find(
      (r) => r.from_count >= 10 && (r.rate_pct == null || r.rate_pct < 25),
    ) ?? null;
  }, [bottleneck]);

  const grouped = useMemo(() => {
    const map = new Map<string, LabRow>();
    for (const r of rows) {
      const key = String(r[group] ?? "—");
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { ...r, [group]: key } as LabRow);
      } else {
        for (const n of NUMERIC) {
          (cur[n] as number) = (Number(cur[n]) || 0) + (Number(r[n]) || 0);
        }
      }
    }
    return [...map.values()].sort((a, b) => b.delivered - a.delivered);
  }, [rows, group]);

  return (
    <div className="admin-theme min-h-screen bg-[#050816] px-5 py-8 text-readable">
      <Helmet>
        <title>Conversion Lab — UNPRO Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white">Conversion Lab</h1>
            <p className="mt-1 text-sm text-white/60">
              Données de production réelles. Aucune donnée simulée.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && !rows.length ? (
          <div className="flex items-center gap-2 p-10 text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des données de production…
          </div>
        ) : (
          <>
            {/* ------------------------------------------------- goulot canonique */}
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-sm font-semibold text-white">Entonnoir canonique</h2>

              {firstWeak && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3 text-[13px] text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Premier blocage matériel : <strong>{firstWeak.transition}</strong> —{" "}
                    {firstWeak.to_count}/{firstWeak.from_count} (
                    {firstWeak.rate_pct == null ? "0" : firstWeak.rate_pct}%). C'est l'action prioritaire.
                  </span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {bottleneck.map((r) => {
                  const weak = firstWeak?.transition === r.transition;
                  return (
                    <div
                      key={r.transition}
                      className={`rounded-2xl border p-3 ${
                        weak ? "border-amber-300/40 bg-amber-400/10" : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-wide text-white/45">{r.transition}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                        {r.rate_pct == null ? "—" : `${r.rate_pct}%`}
                      </p>
                      <p className="text-[11px] text-white/50">
                        {r.to_count} / {r.from_count}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ------------------------------------------------------- variantes */}
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">Performance par variante et cohorte</h2>
                <div className="flex flex-wrap gap-1.5">
                  {GROUPS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setGroup(g.key)}
                      className={`rounded-full border px-3 py-1 text-[12px] transition ${
                        group === g.key
                          ? "border-sky-300/40 bg-sky-400/15 text-sky-100"
                          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-[12.5px]">
                  <thead className="text-[11px] uppercase tracking-wide text-white/45">
                    <tr>
                      <th className="py-2 pr-3">{GROUPS.find((g) => g.key === group)?.label}</th>
                      <th className="py-2 pr-3">Envoyés</th>
                      <th className="py-2 pr-3">Livrés</th>
                      <th className="py-2 pr-3">Clics</th>
                      <th className="py-2 pr-3">Livré→Clic</th>
                      <th className="py-2 pr-3">Landing</th>
                      <th className="py-2 pr-3">Engagé</th>
                      <th className="py-2 pr-3">CTA</th>
                      <th className="py-2 pr-3">Landing→CTA</th>
                      <th className="py-2 pr-3">Checkout</th>
                      <th className="py-2 pr-3">Payé</th>
                      <th className="py-2 pr-3">Objectifs</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Échantillon</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/85">
                    {grouped.map((r) => {
                      const key = String(r[group] ?? "—");
                      const enough = r.delivered >= MIN_SAMPLE;
                      return (
                        <tr key={key} className="border-t border-white/[0.06]">
                          <td className="py-2 pr-3 font-medium text-white">{key}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.sent}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.delivered}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.clicked}</td>
                          <td className="py-2 pr-3 tabular-nums text-sky-200">{pct(r.clicked, r.delivered)}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.landing_viewed}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.landing_engaged}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.cta_clicked}</td>
                          <td className="py-2 pr-3 tabular-nums text-sky-200">
                            {pct(r.cta_clicked, r.landing_viewed)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{r.checkout_created}</td>
                          <td className="py-2 pr-3 tabular-nums font-semibold text-emerald-300">{r.paid}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.goals_completed}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.plan_accepted}</td>
                          <td className="py-2 pr-3">
                            {enough ? (
                              <span className="text-emerald-300">suffisant</span>
                            ) : (
                              <span className="text-white/40">
                                {r.delivered}/{MIN_SAMPLE}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!grouped.length && (
                      <tr>
                        <td colSpan={14} className="py-8 text-center text-white/45">
                          Aucune donnée de production pour cette dimension.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-[11px] text-white/45">
                Aucune variante n'est déclarée gagnante sous {MIN_SAMPLE} messages livrés. Les décisions
                d'optimisation sont bloquées tant que l'échantillon est insuffisant.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
