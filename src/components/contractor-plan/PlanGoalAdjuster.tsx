/**
 * UNPRO — Ajuster l'objectif du plan personnalisé (route plan-personnalise).
 *
 * Objectif de chiffre d'affaires OU de profit, horizon, panier, conversion,
 * marge (obligatoire pour le profit), capacité en RENDEZ-VOUS par mois,
 * répartition facultative par taille de projet. Curseur + saisie numérique :
 * chaque changement recalcule l'estimation et demande un nouveau devis
 * serveur. Les réponses tardives sont ignorées; le paiement reste bloqué
 * tant que le devis affiché ne correspond pas aux entrées.
 * Hypothèses ≠ déclarations; aucun revenu n'est promis.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPricingQuote, type PricingQuote } from "@/services/contractorPricingQuoteService";
import { formatQuebecNumber, parseQuebecNumber } from "@/lib/formatting";
import {
  SIZE_LABELS, appointmentOutcome, goalNeeds, goalQuotePatch, goalSignature, initialAppointments, validateGoal, weightedEconomics,
  type GoalError, type GoalInputs, type ProjectSizeCode, type ProjectSizeEntry, type SizeStance,
} from "@/lib/pricing/planGoalModel";

const ERR: Record<GoalError, string> = {
  invalid_amount: "L'objectif doit être supérieur à 0 $.",
  invalid_horizon: "L'horizon doit être entre 1 et 36 mois.",
  invalid_basket: "Indiquez un panier moyen supérieur à 0 $.",
  invalid_conversion: "La conversion doit être entre 1 % et 100 %.",
  missing_margin: "Indiquez votre marge pour un objectif de profit.",
  invalid_margin: "La marge doit être supérieure à 0 % et au plus 100 %.",
  invalid_capacity: "Indiquez une capacité entière d'au moins 1 rendez-vous par mois.",
  invalid_appointments: "Choisissez au moins 1 rendez-vous par mois.",
  invalid_size_mix: "Chaque part doit être entre 0 % et 100 %.",
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const money = (n: number) => formatQuebecNumber(Math.round(n), "$");
const SIZE_CODES: ProjectSizeCode[] = ["small", "medium", "large"];

export function inputsFromQuote(quote: Pick<PricingQuote, "input_payload" | "target_monthly_appointments">, now = new Date()): GoalInputs {
  const p = (quote.input_payload ?? {}) as Record<string, unknown>;
  const qual = (p.qualification ?? {}) as Record<string, unknown>;
  const conv = num(p.conversion_pct) ?? (num(p.close_rate_estimate) && (p.close_rate_estimate as number) > 0 ? Math.round((p.close_rate_estimate as number) * 10000) / 100 : null);
  const basket = num(p.avg_sale) ?? (num(p.average_project_value) && (p.average_project_value as number) > 0 ? (p.average_project_value as number) : null);
  const yearEnd = Math.max(1, 12 - now.getMonth());
  const capacity = num(qual.capacity_max) ?? num(p.monthly_capacity);
  const mix = (p.project_size_mix as { sizes?: ProjectSizeEntry[] } | undefined)?.sizes;
  return {
    kind: p.goal_kind === "profit" ? "profit" : "sales",
    amount: num(p.goal_amount),
    horizonMonths: num(p.horizon_months) ?? (p.horizon === "year_end" ? yearEnd : 12),
    basket,
    conversionPct: conv,
    marginPct: num(p.margin_pct),
    capacityPerMonth: capacity && capacity >= 1 ? Math.round(capacity) : null,
    appointmentsPerMonth: num(p.target_monthly_appointments) ?? num(quote.target_monthly_appointments),
    sizes: Array.isArray(mix) ? mix : [],
  };
}

function NumField(props: { id: string; label: string; value: number | null; onChange: (v: number | null) => void; unit?: string; hint?: string; testId?: string }) {
  const [raw, setRaw] = useState(props.value === null ? "" : String(props.value).replace(".", ","));
  useEffect(() => {
    const parsed = parseQuebecNumber(raw);
    if (parsed !== props.value) setRaw(props.value === null ? "" : String(props.value).replace(".", ","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);
  return (
    <div>
      <label htmlFor={props.id} className="mb-1 block text-sm font-medium text-white/90">{props.label}</label>
      <div className="flex items-center gap-2">
        <input id={props.id} data-testid={props.testId} inputMode="decimal" enterKeyHint="done" autoComplete="off" value={raw}
          onChange={(e) => { setRaw(e.target.value); const v = e.target.value.trim() ? parseQuebecNumber(e.target.value) : null; props.onChange(v); }}
          className="min-h-12 w-full rounded-xl border border-white/25 bg-white/[0.06] px-4 text-[16px] text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        {props.unit && <span className="text-sm text-white/70">{props.unit}</span>}
      </div>
      {props.hint && <p className="mt-1 text-[12px] text-white/60">{props.hint}</p>}
    </div>
  );
}

export interface GoalAdjusterState { dirty: boolean; recomputing: boolean; valid: boolean; error: string | null }

export function PlanGoalAdjuster({ quote, onQuote, onState }: {
  quote: PricingQuote;
  onQuote: (q: PricingQuote) => void;
  onState: (s: GoalAdjusterState) => void;
}) {
  const [inputs, setInputs] = useState<GoalInputs>(() => {
    const i = inputsFromQuote(quote);
    return { ...i, appointmentsPerMonth: initialAppointments(i) };
  });
  const [recomputing, setRecomputing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sizesOpen, setSizesOpen] = useState((inputs.sizes ?? []).length > 0);
  const reqId = useRef(0);
  const set = (p: Partial<GoalInputs>) => setInputs((cur) => ({ ...cur, ...p }));

  const errors = validateGoal(inputs);
  const needs = goalNeeds(inputs);
  const appts = inputs.appointmentsPerMonth;
  const outcome = appts ? appointmentOutcome(inputs, appts) : null;
  const eco = weightedEconomics(inputs);
  const valid = errors.length === 0 && !!appts && !!inputs.capacityPerMonth && appts <= inputs.capacityPerMonth;
  const patch = useMemo(() => (valid && appts ? goalQuotePatch(inputs, appts) : null), [inputs, appts, valid]);
  const wanted = patch ? goalSignature(patch) : null;
  const current = goalSignature(quote.input_payload as Record<string, unknown>);
  const dirty = !!wanted && wanted !== current;

  useEffect(() => { onState({ dirty: dirty || !valid, recomputing, valid, error: serverError }); }, [dirty, valid, recomputing, serverError, onState]);

  // Recalcul serveur (anti-rebond) : seule la dernière demande peut s'appliquer.
  useEffect(() => {
    if (!dirty || !patch) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setRecomputing(true);
      setServerError(null);
      try {
        const { data, error } = await supabase.functions.invoke("compute-pricing-quote", {
          body: { ...(quote.input_payload ?? {}), ...patch, entry_tier_cents: undefined, quote_id: undefined },
        });
        const newId = (data as { quote_id?: string } | null)?.quote_id;
        if (error || !newId) throw new Error("quote");
        const q = await fetchPricingQuote(newId);
        if (id !== reqId.current) return; // réponse périmée : ignorée
        if (!q) throw new Error("quote");
        onQuote(q);
      } catch {
        if (id === reqId.current) setServerError("La proposition n'a pas pu être recalculée. Vos valeurs sont conservées; réessayez.");
      } finally {
        if (id === reqId.current) setRecomputing(false);
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  const cap = inputs.capacityPerMonth ?? 0;
  const setSize = (code: ProjectSizeCode, p: Partial<ProjectSizeEntry>) => {
    const list = [...(inputs.sizes ?? [])];
    const i = list.findIndex((s) => s.code === code);
    if (i >= 0) list[i] = { ...list[i], ...p }; else list.push({ code, ...p });
    set({ sizes: list });
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 mb-4" data-testid="goal-adjuster" aria-labelledby="goal-adjuster-title">
      <h2 id="goal-adjuster-title" className="text-lg font-semibold">Ajuster mon objectif</h2>
      <p className="mt-1 text-[12px] text-white/65">Vos hypothèses, modifiables. Estimation seulement : aucun revenu n'est garanti.</p>

      <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type d'objectif">
        {(["sales", "profit"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={inputs.kind === k} onClick={() => set({ kind: k })}
            className={`min-h-11 rounded-[18px] border px-3 text-sm ${inputs.kind === k ? "border-amber-400 bg-amber-500/15 text-amber-100" : "border-white/15 bg-white/5 text-white/85"}`}>
            {k === "sales" ? "Chiffre d'affaires ajouté" : "Profit ajouté"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NumField id="goal-amount" testId="goal-amount" label={inputs.kind === "sales" ? "Objectif de chiffre d'affaires (CAD HT)" : "Objectif de profit (CAD HT)"} value={inputs.amount} unit="$" onChange={(v) => set({ amount: v })} />
        <NumField id="goal-horizon" testId="goal-horizon" label="Horizon" value={inputs.horizonMonths} unit="mois" onChange={(v) => set({ horizonMonths: v === null ? 0 : Math.round(v) })} />
        <NumField id="goal-basket" testId="goal-basket" label="Panier moyen (hypothèse)" value={inputs.basket} unit="$" onChange={(v) => set({ basket: v })} hint={eco.source === "declared_mix" ? `Pondéré par votre répartition : ${eco.basket ? money(eco.basket) : "—"}` : undefined} />
        <NumField id="goal-conversion" testId="goal-conversion" label="Conversion rendez-vous → contrat (hypothèse)" value={inputs.conversionPct} unit="%" onChange={(v) => set({ conversionPct: v })} />
        <NumField id="goal-margin" testId="goal-margin" label={inputs.kind === "profit" ? "Marge bénéficiaire (requise)" : "Marge bénéficiaire (facultative)"} value={inputs.marginPct} unit="%" onChange={(v) => set({ marginPct: v })} />
        <NumField id="goal-capacity" testId="goal-capacity" label="Capacité déclarée (rendez-vous par mois)" value={inputs.capacityPerMonth} unit="RDV/mois" onChange={(v) => set({ capacityPerMonth: v === null ? null : Math.round(v), appointmentsPerMonth: v && appts && appts > v ? Math.max(1, Math.round(v)) : appts })} hint="Des rencontres avec des clients, pas des contrats ni des chantiers." />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 text-sm text-amber-200" data-testid="goal-errors">
          {errors.map((e) => <li key={e}>{ERR[e]}</li>)}
        </ul>
      )}

      {needs && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/85" data-testid="goal-needs">
          <p>Pour {money(inputs.amount ?? 0)} sur {inputs.horizonMonths} mois : <strong data-testid="needs-contracts">{needs.contractsTotal} contrats</strong>, <strong data-testid="needs-appointments">{needs.appointmentsTotal} rendez-vous</strong>, soit environ <strong data-testid="needs-monthly">{needs.appointmentsPerMonthNeeded} rendez-vous par mois</strong>.</p>
          <p className="mt-1 text-white/70">Valeur commerciale attendue d'un rendez-vous selon vos hypothèses : {money(needs.expectedValuePerAppointment)} ({inputs.kind === "profit" ? "panier × conversion × marge" : "panier × conversion"}). Ce n'est pas le tarif UNPRO.</p>
          {needs.capacityGap > 0 && (
            <div className="mt-2 space-y-2" data-testid="capacity-gap">
              <p className="text-amber-200">Votre capacité déclarée ({cap} RDV/mois) est inférieure au besoin ({needs.appointmentsPerMonthNeeded} RDV/mois). Écart : {needs.capacityGap} RDV/mois.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="min-h-11 rounded-full border border-white/20 px-4 text-sm" data-testid="fit-goal-to-capacity"
                  onClick={() => { const o = appointmentOutcome(inputs, cap); if (o) set({ amount: inputs.kind === "profit" && o.horizonProfit !== null ? o.horizonProfit : o.horizonRevenue, appointmentsPerMonth: cap }); }}>
                  Ajuster l'objectif à ma capacité
                </button>
                <button type="button" className="min-h-11 rounded-full border border-white/20 px-4 text-sm" data-testid="raise-capacity"
                  onClick={() => document.getElementById("goal-capacity")?.focus()}>
                  Modifier ma capacité
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {cap >= 1 && (
        <div className="mt-4">
          <label htmlFor="goal-appointments-range" className="block text-sm font-medium text-white/90">Rendez-vous par mois visés</label>
          <div className="mt-2 flex items-center gap-3">
            <input id="goal-appointments-range" type="range" min={1} max={cap} step={1} value={Math.min(appts ?? 1, cap)} data-testid="goal-appointments-range"
              aria-valuetext={`${appts ?? 1} rendez-vous par mois`}
              onChange={(e) => set({ appointmentsPerMonth: Number(e.target.value) })} className="h-11 w-full accent-amber-400" />
            <input aria-label="Rendez-vous par mois (saisie)" inputMode="numeric" enterKeyHint="done" data-testid="goal-appointments-input"
              value={appts ?? ""} onChange={(e) => { const v = parseQuebecNumber(e.target.value); set({ appointmentsPerMonth: v === null ? null : Math.min(cap, Math.max(1, Math.round(v))) }); }}
              className="min-h-12 w-20 rounded-xl border border-white/25 bg-white/[0.06] px-3 text-center text-[16px] text-white" />
          </div>
          <p className="mt-1 text-[12px] text-white/60">Plafonné à votre capacité déclarée ({cap} RDV/mois).</p>
          {outcome && (
            <p className="mt-2 text-sm text-white/85" data-testid="goal-outcome">
              Avec {outcome.appointmentsPerMonth} RDV/mois : environ <strong>{formatQuebecNumber(outcome.contractsPerMonth, "%").replace("\u00A0%", "")} contrats/mois</strong> et <strong data-testid="outcome-revenue">{money(outcome.estimatedRevenuePerMonth)}</strong> de chiffre d'affaires estimé par mois{outcome.estimatedProfitPerMonth !== null ? <>, profit estimé {money(outcome.estimatedProfitPerMonth)}/mois</> : null}.
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <button type="button" className="min-h-11 text-sm text-white/80 underline underline-offset-4" aria-expanded={sizesOpen} onClick={() => setSizesOpen((o) => !o)} data-testid="toggle-sizes">
          Répartition par taille de projet (facultatif)
        </button>
        {sizesOpen && (
          <div className="mt-2 space-y-3" data-testid="size-mix">
            <p className="text-[12px] text-white/65">Aucune fourchette n'est imposée : indiquez vos propres valeurs. Sans répartition, votre panier moyen reste une seule hypothèse.</p>
            {SIZE_CODES.map((code) => {
              const e = (inputs.sizes ?? []).find((s) => s.code === code) ?? { code };
              return (
                <fieldset key={code} className="rounded-2xl border border-white/10 p-3">
                  <legend className="px-1 text-sm font-medium">{SIZE_LABELS.fr[code]}</legend>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Intérêt pour ${SIZE_LABELS.fr[code].toLowerCase()}`}>
                    {(["sought", "accepted", "refused"] as SizeStance[]).map((st) => (
                      <button key={st} type="button" role="radio" aria-checked={e.stance === st} onClick={() => setSize(code, { stance: st })}
                        className={`min-h-11 rounded-full border px-3 text-sm ${e.stance === st ? "border-amber-400 bg-amber-500/15" : "border-white/15"}`}>
                        {st === "sought" ? "Recherché" : st === "accepted" ? "Accepté" : "Refusé"}
                      </button>
                    ))}
                  </div>
                  {e.stance !== "refused" && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <NumField id={`size-share-${code}`} label="Part des mandats" unit="%" value={e.sharePct ?? null} onChange={(v) => setSize(code, { sharePct: v })} />
                      <NumField id={`size-basket-${code}`} label="Panier" unit="$" value={e.basket ?? null} onChange={(v) => setSize(code, { basket: v })} />
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-4 text-[12px] text-white/70" role="status" data-testid="quote-sync">
        {recomputing ? <span className="inline-flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Recalcul de la proposition…</span>
          : serverError ? <span className="text-red-200">{serverError}</span>
          : !valid ? "Corrigez les valeurs pour mettre à jour la proposition."
          : dirty ? "Mise à jour de la proposition…" : "Proposition à jour avec ces valeurs."}
      </p>
    </section>
  );
}
