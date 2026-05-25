/**
 * UNPRO — Admin Plans Matrix Cockpit
 * Manage the canonical plans + features matrix.
 */
import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Lock, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePlanMatrix } from "@/features/planSystem";
import type { Plan, PlanFeature } from "@/features/planSystem/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPriceCents } from "@/lib/formatPrice";

type Tab = "matrix" | "multipliers" | "health";

export default function PageAdminPlansMatrix() {
  const { data, isLoading, refetch } = usePlanMatrix();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("matrix");
  const [busy, setBusy] = useState<string | null>(null);

  const plans = data?.plans ?? [];
  const features = data?.features ?? [];

  const featureKeys = useMemo(
    () => Array.from(new Set(features.map((f) => f.featureKey))).sort(),
    [features],
  );

  async function toggleFeature(plan: Plan, key: string) {
    const current = features.find((f) => f.planCode === plan.code && f.featureKey === key);
    if (!current) return;
    const id = current.id;
    setBusy(id);
    const { error } = await supabase
      .from("plan_features" as any)
      .update({ enabled: !current.enabled })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }
    toast.success(`${plan.name} · ${key} → ${!current.enabled ? "activé" : "désactivé"}`);
    qc.invalidateQueries({ queryKey: ["plan-matrix"] });
  }

  async function updateLimit(plan: Plan, key: string, raw: string) {
    const current = features.find((f) => f.planCode === plan.code && f.featureKey === key);
    if (!current) return;
    const parsed = raw.trim() === "" ? null : Number(raw);
    if (parsed !== null && Number.isNaN(parsed)) return;
    setBusy(current.id);
    const { error } = await supabase
      .from("plan_features" as any)
      .update({ limit_value: parsed })
      .eq("id", current.id);
    setBusy(null);
    if (error) toast.error("Erreur: " + error.message);
    else {
      toast.success("Limite mise à jour");
      qc.invalidateQueries({ queryKey: ["plan-matrix"] });
    }
  }

  async function updatePlanMultiplier(plan: Plan, field: keyof Plan, value: number) {
    const dbField =
      field === "visibilityMultiplier"
        ? "visibility_multiplier"
        : field === "recommendationMultiplier"
        ? "recommendation_multiplier"
        : field === "aiIndexPriority"
        ? "ai_index_priority"
        : null;
    if (!dbField) return;
    setBusy(plan.id);
    const { error } = await supabase
      .from("plans" as any)
      .update({ [dbField]: value })
      .eq("id", plan.id);
    setBusy(null);
    if (error) toast.error("Erreur: " + error.message);
    else {
      toast.success(`${plan.name} mis à jour`);
      qc.invalidateQueries({ queryKey: ["plan-matrix"] });
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-300/80 font-semibold mb-2">
              Admin · AI Visibility OS
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Plans × Features Matrix
            </h1>
            <p className="text-white/60 mt-2 text-sm max-w-2xl">
              Source canonique pour tous les plans, multipliers IA et accès fonctionnels.
              Chaque changement impacte instantanément le scoring, le matching et la visibilité.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-sm font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
        </header>

        <div className="flex gap-2 mb-8 overflow-x-auto">
          {(
            [
              { id: "matrix", label: "Matrice Features" },
              { id: "multipliers", label: "Multipliers IA" },
              { id: "health", label: "Health par plan" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                tab === t.id
                  ? "bg-white text-black"
                  : "bg-white/[0.04] border border-white/10 text-white/70 hover:bg-white/[0.08]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : tab === "matrix" ? (
          <MatrixTable
            plans={plans}
            features={features}
            featureKeys={featureKeys}
            busy={busy}
            onToggle={toggleFeature}
            onUpdateLimit={updateLimit}
          />
        ) : tab === "multipliers" ? (
          <MultipliersPanel plans={plans} busy={busy} onUpdate={updatePlanMultiplier} />
        ) : (
          <HealthPanel plans={plans} />
        )}
      </div>
    </div>
  );
}

function MatrixTable({
  plans,
  features,
  featureKeys,
  busy,
  onToggle,
  onUpdateLimit,
}: {
  plans: Plan[];
  features: PlanFeature[];
  featureKeys: string[];
  busy: string | null;
  onToggle: (plan: Plan, key: string) => void;
  onUpdateLimit: (plan: Plan, key: string, raw: string) => void;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03]">
            <tr>
              <th className="text-left p-4 font-semibold text-white/80">Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="text-center p-4 font-semibold text-white/80 min-w-[120px]">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureKeys.map((key) => (
              <tr key={key} className="border-t border-white/5">
                <td className="p-4 font-mono text-xs text-white/70">{key}</td>
                {plans.map((p) => {
                  const f = features.find(
                    (x) => x.planCode === p.code && x.featureKey === key,
                  );
                  const isBusy = f?.id === busy;
                  return (
                    <td key={p.id} className="p-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => onToggle(p, key)}
                          disabled={isBusy}
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                            f?.enabled
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                              : "bg-white/[0.04] border border-white/10 text-white/40",
                          )}
                        >
                          {isBusy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : f?.enabled ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                        {f?.enabled && (
                          <input
                            type="text"
                            defaultValue={f.limitValue ?? ""}
                            placeholder="∞"
                            onBlur={(e) => {
                              if (String(f.limitValue ?? "") !== e.target.value)
                                onUpdateLimit(p, key, e.target.value);
                            }}
                            className="w-16 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-center text-xs"
                          />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MultipliersPanel({
  plans,
  busy,
  onUpdate,
}: {
  plans: Plan[];
  busy: string | null;
  onUpdate: (plan: Plan, field: keyof Plan, value: number) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.id}
          className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 flex flex-col gap-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-300/80 font-semibold">
                Tier #{p.tierRank}
              </div>
              <h3 className="text-2xl font-semibold tracking-tight mt-1">{p.name}</h3>
              <p className="text-white/60 text-sm mt-1">{p.tagline}</p>
            </div>
            {p.id === busy && <Loader2 className="w-4 h-4 animate-spin text-white/60" />}
          </div>

          <NumberField
            label="Visibility multiplier"
            help="Boost de visibilité globale (1× → 5×)"
            value={p.visibilityMultiplier}
            step={0.1}
            min={1}
            max={10}
            onChange={(v) => onUpdate(p, "visibilityMultiplier", v)}
          />
          <NumberField
            label="Recommendation multiplier"
            help="Pondération dans le score de recommandation"
            value={p.recommendationMultiplier}
            step={0.1}
            min={1}
            max={10}
            onChange={(v) => onUpdate(p, "recommendationMultiplier", v)}
          />
          <NumberField
            label="AI index priority"
            help="Priorité de citation par les IA (0-100)"
            value={p.aiIndexPriority}
            step={5}
            min={0}
            max={100}
            onChange={(v) => onUpdate(p, "aiIndexPriority", v)}
          />

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs">
            <Stat label="Trust" value={`+${(p.trustBoost * 100).toFixed(0)}%`} />
            <Stat label="SEO" value={`+${(p.seoBoost * 100).toFixed(0)}%`} />
            <Stat label="Cite" value={`+${(p.citationBoost * 100).toFixed(0)}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NumberField({
  label,
  help,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  help: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-white/80">{label}</span>
        <span className="text-xs text-white/50">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-400"
      />
      <p className="text-[10px] text-white/40 mt-1">{help}</p>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-white/50 uppercase tracking-wider text-[10px]">{label}</div>
      <div className="text-white font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function HealthPanel({ plans }: { plans: Plan[] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6">
      <div className="grid gap-3">
        {plans.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-white/50">{p.tagline}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatPriceCents(p.monthlyPrice)}/mois</div>
              <div className="text-xs text-white/50">{p.appointmentsIncluded} RDV inclus</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/40 mt-6 leading-relaxed">
        Métriques détaillées (MRR, visibilité moyenne, citations IA, taux de booking) branchées dès
        que les snapshots de `profile_visibility_history` atteignent 30 jours.
      </p>
    </div>
  );
}
