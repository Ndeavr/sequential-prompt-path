import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { simulate, clampField, SIM_DEFAULTS, SIM_BOUNDS, type SimInput } from '@/lib/heatPumpRevenueSim';

type NumKey = keyof typeof SIM_BOUNDS;
interface Props { lang: 'fr' | 'en'; planHref: string; onClaraDraft: (text: string) => void }

export default function HeatPumpRevenueSimulator({ lang, planHref, onClaraDraft }: Props) {
  const fr = lang === 'fr';
  const t = (a: string, b: string) => (fr ? a : b);
  const reduce = useReducedMotion();
  const [input, setInput] = useState<SimInput>({ ...SIM_DEFAULTS });
  const [raw, setRaw] = useState<Record<NumKey, string>>(() =>
    Object.fromEntries(Object.keys(SIM_BOUNDS).map(k => [k, String(SIM_DEFAULTS[k as NumKey])])) as Record<NumKey, string>);
  const res = simulate(input);
  const loc = fr ? 'fr-CA' : 'en-CA';
  const money = (n: number, d = 0) => new Intl.NumberFormat(loc, { style: 'currency', currency: 'CAD', minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  const num = (n: number) => new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(n);

  const setField = (k: NumKey, v: string) => {
    setRaw(r => ({ ...r, [k]: v }));
    const n = v.trim() === '' ? null : Number(v.replace(',', '.'));
    setInput(i => ({ ...i, [k]: n === null || !Number.isFinite(n) ? null : clampField(k, n) }));
  };
  const commit = (k: NumKey) => { const v = input[k]; if (v !== null) setRaw(r => ({ ...r, [k]: String(v) })); };

  const fields: { k: NumKey; label: string; step: number; slider?: boolean; hint?: string }[] = [
    { k: 'objective', label: t('Objectif de chiffre d’affaires ajouté (CAD HT/an)', 'Added annual revenue goal (CAD before tax)'), step: 10000, slider: true },
    { k: 'avgTicket', label: t('Valeur moyenne d’une installation centrale (CAD HT)', 'Average central installation value (CAD before tax)'), step: 500, slider: true },
    { k: 'conversionPct', label: t('Conversion RDV tenus → vente (%)', 'Held appointment → sale conversion (%)'), step: 1, slider: true },
    { k: 'showRatePct', label: t('Taux de présence aux RDV (%)', 'Appointment show rate (%)'), step: 1, slider: true },
    { k: 'weeks', label: t('Semaines travaillées par an', 'Weeks worked per year'), step: 1 },
    { k: 'costPerAppointment', label: t('Coût par RDV (CAD HT)', 'Cost per appointment (CAD before tax)'), step: 10, hint: t('Hypothèse de simulation — tarif à confirmer dans votre plan', 'Simulation assumption — rate to be confirmed in your plan') },
    { k: 'monthlySubscription', label: t('Abonnement mensuel (CAD HT)', 'Monthly subscription (CAD before tax)'), step: 10, hint: t('Hypothèse — 0 par défaut', 'Assumption — 0 by default') },
  ];

  const qs = new URLSearchParams(planHref.split('?')[1] ?? '');
  qs.set('metier', 'Thermopompes');
  if (input.objective !== null) qs.set('sim_objectif', String(input.objective));
  if (input.avgTicket !== null) qs.set('sim_panier', String(input.avgTicket));
  if (input.conversionPct !== null) qs.set('sim_conversion', String(input.conversionPct));
  if (res.ok) qs.set('sim_rdv', String(res.plannedAppointments));
  const href = `${planHref.split('?')[0]}?${qs}`;

  const draft = res.ok
    ? t(`Je veux ajouter ${money(input.objective!)} HT par an en installations centrales de thermopompes. Hypothèses : panier moyen ${money(input.avgTicket!)}, conversion ${input.conversionPct} %, présence ${input.showRatePct} %. La simulation donne environ ${res.plannedAppointments} rendez-vous par an. Pouvez-vous m’aider à construire un plan réaliste?`,
        `I want to add ${money(input.objective!)} per year in central heat pump installations. Assumptions: average ticket ${money(input.avgTicket!)}, conversion ${input.conversionPct}%, show rate ${input.showRatePct}%. The simulation gives about ${res.plannedAppointments} appointments per year. Can you help me build a realistic plan?`)
    : null;

  const Stat = ({ label, value, id }: { label: string; value: string; id: string }) => (
    <div className="utp-sim-stat"><span>{label}</span>
      <motion.strong key={value} data-testid={id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.35 }}>{value}</motion.strong></div>
  );

  return (
    <section id="simulateur" className="utp-wrap utp-section" aria-labelledby="sim-title">
      <div className="utp-eyebrow">{t('03 / SIMULATEUR', '03 / SIMULATOR')}</div>
      <h2 id="sim-title">{t('Et si vous ajoutiez 1 000 000 $', 'What if you added $1,000,000')}<br /><span>{t('à votre chiffre d’affaires annuel?', 'to your annual revenue?')}</span></h2>
      <div className="utp-demo-grid">
        <div className="utp-controls">
          <div className="utp-small-title">{t('Vos hypothèses (modifiables)', 'Your assumptions (editable)')}</div>
          {fields.map(f => (
            <label key={f.k} htmlFor={`sim-${f.k}`} className="utp-sim-field">
              <strong>{f.label}</strong>
              {f.hint && <small>{f.hint}</small>}
              <input id={`sim-${f.k}`} type="number" inputMode="decimal" min={SIM_BOUNDS[f.k][0]} max={SIM_BOUNDS[f.k][1]} step={f.step}
                value={raw[f.k]} onChange={e => setField(f.k, e.target.value)} onBlur={() => commit(f.k)} />
              {f.slider && <input type="range" aria-label={f.label} min={SIM_BOUNDS[f.k][0]} max={SIM_BOUNDS[f.k][1]} step={f.step}
                value={input[f.k] ?? SIM_BOUNDS[f.k][0]} onChange={e => setField(f.k, e.target.value)} />}
            </label>
          ))}
          <label className="utp-sim-check"><input type="checkbox" checked={input.alreadyActivated} onChange={e => setInput(i => ({ ...i, alreadyActivated: e.target.checked }))} />
            {t('Profil déjà activé (retirer l’activation unique de 350 $)', 'Profile already activated (remove the one-time $350 activation)')}</label>
        </div>
        <div className="utp-results" aria-live="polite">
          <div className="utp-small-title">{t('Synthèse', 'Summary')}<span>{t('SIMULATION', 'SIMULATION')}</span></div>
          {res.ok === false ? (
            <p className="utp-empty" data-testid="sim-not-calculable">{res.reason === 'zero_rate'
              ? t('Objectif non calculable avec un taux de 0 %. Indiquez un taux de conversion et de présence supérieurs à 0.', 'Goal cannot be calculated with a 0% rate. Enter conversion and show rates above 0.')
              : t('Complétez les hypothèses pour voir la simulation.', 'Complete the assumptions to see the simulation.')}</p>
          ) : (<>
            <div className="utp-sim-grid">
              <Stat id="sim-sales" label={t('Ventes nécessaires', 'Sales needed')} value={num(res.sales)} />
              <Stat id="sim-held" label={t('RDV tenus / an', 'Held appointments / yr')} value={num(res.heldAppointments)} />
              <Stat id="sim-planned" label={t('RDV planifiés / an', 'Scheduled appointments / yr')} value={num(res.plannedAppointments)} />
              <Stat id="sim-monthly" label={t('RDV / mois (moyenne)', 'Appointments / month (avg)')} value={num(res.monthlyAppointments)} />
              <Stat id="sim-weekly" label={t('RDV / semaine', 'Appointments / week')} value={num(res.weeklyAppointments)} />
              <Stat id="sim-revenue" label={t('Chiffre d’affaires correspondant', 'Corresponding revenue')} value={money(res.revenue)} />
            </div>
            <hr />
            <div className="utp-sim-costs">
              <p><span>{t('RDV', 'Appointments')} ({num(res.plannedAppointments)} × {money(input.costPerAppointment!)})</span><b>{money(res.appointmentCost)}</b></p>
              <p><span>{t('Abonnement', 'Subscription')} ({money(input.monthlySubscription!)} × 12)</span><b>{money(res.subscriptionCost)}</b></p>
              <p><span>{t('Activation unique (année 1)', 'One-time activation (year 1)')}</span><b>{money(res.activationCost)}</b></p>
              <p className="is-total"><span>{t('Coût UNPRO estimé, année 1 (HT)', 'Estimated UNPRO cost, year 1 (before tax)')}</span><b data-testid="sim-total">{money(res.totalCost)}</b></p>
              <p><span>{t('Moyenne mensuelle, année 1', 'Monthly average, year 1')}</span><b data-testid="sim-month-cost">{money(res.monthlyAverageCost, 2)}</b></p>
              <p><span>{t('Coût d’acquisition par vente', 'Acquisition cost per sale')}</span><b data-testid="sim-per-sale">{money(res.costPerSale, 2)}</b></p>
              <p><span>{t('Part du chiffre d’affaires', 'Share of revenue')}</span><b>{num(res.costPctOfRevenue)} %</b></p>
            </div>
          </>)}
          <p className="utp-fine">{t('Simulation selon vos hypothèses. Volume de demandes et résultats non garantis. Coûts d’installation et marge non inclus.', 'Simulation based on your assumptions. Request volume and results not guaranteed. Installation costs and margin not included.')}</p>
          <div className="utp-actions">
            <Link className="utp-button" to={href} data-testid="sim-cta">{t('Construire mon plan pour cet objectif', 'Build my plan for this goal')} <ArrowUpRight size={18} /></Link>
            {draft && <button type="button" className="utp-link" onClick={() => onClaraDraft(draft)}>{t('Préparer un message à Clara', 'Prepare a message to Clara')} <MessageCircle size={16} className="inline" /></button>}
          </div>
          <p className="utp-fine">{t('Le prix réel est calculé dans votre plan personnalisé avant tout paiement. Rien n’est sauvegardé ni envoyé ici.', 'The actual price is calculated in your custom plan before any payment. Nothing is saved or sent here.')}</p>
        </div>
      </div>
    </section>
  );
}
