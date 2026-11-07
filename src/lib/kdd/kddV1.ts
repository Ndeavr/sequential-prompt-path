/**
 * KDD v1 — pure, read-only computation for the admin evidence panel.
 * No I/O here: rows come from existing admin-RLS tables (see docs/kdd-v1.md).
 * Rules mirror public.contractor_plan_code(): an entry-350 business counts only
 * with a stripe_webhook ledger row joined to a LIVE signed, paid, 35000-cent CAD
 * checkout event, not voided by refund/dispute/deactivation.
 */

export type EvidenceStatus = "verified" | "partial" | "unknown" | "declared";

export interface Insight {
  id: string;
  title: string;
  value: string;
  provenance: string[];
  window: string;
  evidence: EvidenceStatus;
  detail?: string;
  action: string;
}

export interface WebhookRow {
  stripe_event_id: string | null;
  event_type: string | null;
  livemode: boolean | null;
  session_id: string | null;
  payment_intent_id: string | null;
  created_at: string;
  payment_status: string | null;
  amount_subtotal: string | number | null;
  currency: string | null;
  offer: string | null;
  test_mode: string | null;
  e2e_test: string | null;
  obj_payment_intent: string | null;
}

export interface LedgerRow {
  contractor_id: string | null;
  action: string;
  source: string | null;
  created_at: string;
  meta_livemode: string | null;
  meta_event_id: string | null;
  meta_session_id: string | null;
}

export const GOAL_350 = 3000;
export const GOAL_DEADLINE = "2026-12-31";
export const ENTRY_OFFERS = new Set(["entry_activation_350", "entry_pack_350"]);
const PAID_EVENT_TYPES = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const REVERSAL_EVENT_TYPES = new Set([
  "charge.refunded",
  "charge.refund.updated",
  "charge.dispute.created",
  "charge.dispute.funds_withdrawn",
  "checkout.session.async_payment_failed",
]);
const TZ = "America/Toronto";

/* ------------------------------ dates ------------------------------ */

export function torontoDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function torontoMonth(d: Date | string): string {
  return torontoDate(d).slice(0, 7);
}

function dayIndex(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

const isTrue = (v: unknown) => v === true || String(v ?? "").toLowerCase() === "true";

/* --------------------------- 350 revenue --------------------------- */

export interface OtherPaidOffer {
  offer: string;
  sessions: number;
  amountSubtotalCents: number;
  excludedFromGoalReason: string;
}

export interface Entry350Result {
  verifiedBusinesses: number;
  verifiedPretaxCents: number;
  verifiedDates: string[]; // Toronto date of first verified payment per business
  verifiedBusinessIds: string[];
  duplicateEvents: number;
  duplicatePaidSessionsSameBusiness: number;
  sessionsSharedAcrossBusinesses: number;
  excluded: {
    test: number;
    reversed: number;
    unknownLivemode: number;
    ledgerProofMissing: number;
    ledgerIdentityMissing: number;
    livePaidWithoutActivation: number;
    unpaidOrPending: number;
  };
  otherPaidOffers: OtherPaidOffer[];
  latestWebhookAt: string | null;
}

export function computeEntry350(webhooks: WebhookRow[], ledger: LedgerRow[]): Entry350Result {
  // 1. dedupe Stripe events by stripe_event_id (replays never count twice)
  const events = new Map<string, WebhookRow>();
  let duplicateEvents = 0;
  let latestWebhookAt: string | null = null;
  for (const w of webhooks) {
    if (!latestWebhookAt || w.created_at > latestWebhookAt) latestWebhookAt = w.created_at;
    const key = w.stripe_event_id ?? `noid:${w.session_id ?? ""}:${w.created_at}`;
    if (events.has(key)) { duplicateEvents++; continue; }
    events.set(key, w);
  }

  // 2. reversals (refund / dispute / failed async) by payment intent, plus ledger deactivations by session
  const reversedPI = new Set<string>();
  const reversedSessions = new Set<string>();
  for (const e of events.values()) {
    if (e.event_type && REVERSAL_EVENT_TYPES.has(e.event_type) && e.livemode !== false) {
      const pi = e.obj_payment_intent ?? e.payment_intent_id;
      if (pi) reversedPI.add(pi);
      if (e.session_id) reversedSessions.add(e.session_id);
    }
  }
  for (const l of ledger) {
    if (l.action === "deactivated" && l.source === "stripe_webhook" && l.meta_session_id) reversedSessions.add(l.meta_session_id);
  }

  const is350 = (e: WebhookRow) =>
    Number(e.amount_subtotal) === 35000 &&
    String(e.currency ?? "").toLowerCase() === "cad" &&
    ENTRY_OFFERS.has(String(e.offer ?? ""));
  const isTestMarked = (e: WebhookRow) => e.livemode === false || isTrue(e.test_mode) || isTrue(e.e2e_test);
  const isReversed = (e: WebhookRow) =>
    (!!e.session_id && reversedSessions.has(e.session_id)) ||
    (!!(e.payment_intent_id ?? e.obj_payment_intent) && reversedPI.has((e.payment_intent_id ?? e.obj_payment_intent) as string));

  // 3. paid checkout sessions (deduped by session)
  const paidSessions = new Map<string, WebhookRow>();
  let unpaidOrPending = 0;
  const seenUnpaid = new Set<string>();
  for (const e of events.values()) {
    if (!e.event_type || !PAID_EVENT_TYPES.has(e.event_type)) continue;
    const skey = e.session_id ?? `event:${e.stripe_event_id}`;
    if (e.payment_status !== "paid") {
      if (!seenUnpaid.has(skey)) { seenUnpaid.add(skey); unpaidOrPending++; }
      continue;
    }
    if (!paidSessions.has(skey)) paidSessions.set(skey, e);
  }

  const excluded = {
    test: 0, reversed: 0, unknownLivemode: 0, ledgerProofMissing: 0,
    ledgerIdentityMissing: 0, livePaidWithoutActivation: 0, unpaidOrPending,
  };

  // 4. ledger entitlement rows joined to signed live events
  const firstByBusiness = new Map<string, { date: string; cents: number; session: string }>();
  const sessionOwner = new Map<string, string>();
  const entitledSessions = new Set<string>();
  let duplicatePaidSessionsSameBusiness = 0;
  let sessionsSharedAcrossBusinesses = 0;
  const entitlementRows = ledger
    .filter((l) => l.action === "entry_activation_350_paid" && l.source === "stripe_webhook")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const l of entitlementRows) {
    if (l.meta_session_id) entitledSessions.add(l.meta_session_id); // every ledger-referenced session is classified once here
    const ev = l.meta_event_id ? events.get(l.meta_event_id) : undefined;
    if (l.meta_livemode === "false" || (ev && isTestMarked(ev))) { excluded.test++; continue; }
    if (!ev || ev.session_id !== l.meta_session_id || !l.meta_session_id) { excluded.ledgerProofMissing++; continue; }
    if (ev.livemode !== true || l.meta_livemode !== "true") { excluded.unknownLivemode++; continue; }
    if (!ev.event_type || !PAID_EVENT_TYPES.has(ev.event_type) || ev.payment_status !== "paid" || !is350(ev)) {
      excluded.ledgerProofMissing++; continue;
    }
    if (isReversed(ev)) { excluded.reversed++; continue; }
    if (!l.contractor_id) { excluded.ledgerIdentityMissing++; continue; }
    const owner = sessionOwner.get(l.meta_session_id);
    if (owner && owner !== l.contractor_id) { sessionsSharedAcrossBusinesses++; continue; }
    if (owner === l.contractor_id) continue; // same session replayed in ledger
    sessionOwner.set(l.meta_session_id, l.contractor_id);
    if (firstByBusiness.has(l.contractor_id)) { duplicatePaidSessionsSameBusiness++; continue; }
    firstByBusiness.set(l.contractor_id, {
      date: torontoDate(l.created_at),
      cents: Number(ev.amount_subtotal),
      session: l.meta_session_id,
    });
  }

  // 5. paid sessions not counted: test, unknown livemode, paid 350 without entitlement, other offers
  const other = new Map<string, OtherPaidOffer>();
  for (const [skey, e] of paidSessions) {
    if (entitledSessions.has(skey)) continue; // already classified through the ledger
    if (isTestMarked(e)) { excluded.test++; continue; }
    if (e.livemode !== true) { excluded.unknownLivemode++; continue; }
    if (is350(e)) {
      if (isReversed(e)) excluded.reversed++;
      else excluded.livePaidWithoutActivation++;
      continue;
    }
    const offer = e.offer || "sans_offre";
    const cents = Number(e.amount_subtotal) || 0;
    const reason = isReversed(e)
      ? "remboursé ou contesté"
      : cents <= 100 ? "offre 1 $ ou gratuite" : "autre offre payée (hors objectif 350 $)";
    const k = `${offer}|${reason}`;
    const cur = other.get(k) ?? { offer, sessions: 0, amountSubtotalCents: 0, excludedFromGoalReason: reason };
    cur.sessions++;
    cur.amountSubtotalCents += cents;
    other.set(k, cur);
  }

  const firsts = [...firstByBusiness.values()];
  return {
    verifiedBusinesses: firsts.length,
    verifiedPretaxCents: firsts.reduce((s, f) => s + f.cents, 0),
    verifiedDates: firsts.map((f) => f.date).sort(),
    verifiedBusinessIds: [...firstByBusiness.keys()],
    duplicateEvents,
    duplicatePaidSessionsSameBusiness,
    sessionsSharedAcrossBusinesses,
    excluded,
    otherPaidOffers: [...other.values()].sort((a, b) => b.sessions - a.sessions),
    latestWebhookAt,
  };
}

/* ------------------------------- pace ------------------------------ */

export interface PaceResult {
  today: string;
  goal: number;
  actual: number;
  gap: number;
  daysRemaining: number; // inclusive of today, America/Toronto
  requiredPerDay: number | null;
  observedLast30PerDay: number;
}

export function computePace(actual: number, verifiedDates: string[], now: Date, goal = GOAL_350, deadline = GOAL_DEADLINE): PaceResult {
  const today = torontoDate(now);
  const daysRemaining = Math.max(0, dayIndex(deadline) - dayIndex(today) + 1);
  const gap = Math.max(0, goal - actual);
  const t = dayIndex(today);
  const last30 = verifiedDates.filter((d) => { const i = dayIndex(d); return i <= t && i > t - 30; }).length;
  return {
    today, goal, actual, gap, daysRemaining,
    requiredPerDay: daysRemaining > 0 ? gap / daysRemaining : null,
    observedLast30PerDay: last30 / 30,
  };
}

/* ----------------------------- cohorts ----------------------------- */

export const FUNNEL_STAGES = [
  "contacted_at", "delivered_at", "opened_at", "clicked_at",
  "registered_at", "onboarded_at", "paid_at", "activated_at",
] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export type FunnelRow = {
  contractor_id: string | null;
  created_at: string;
  current_stage: string | null;
  updated_at?: string | null;
} & Partial<Record<FunnelStage, string | null>>;

export interface CohortStageCell {
  stage: FunnelStage;
  count: number;
  rate: number | null; // null = not computable (unknown tracking or empty cohort)
  status: "declared" | "unknown";
}

export interface Cohort {
  month: string;
  size: number;
  stages: CohortStageCell[];
  verifiedPaid: number; // joined to verified 350 businesses
}

export interface CohortResult {
  cohorts: Cohort[];
  instrumented: Record<FunnelStage, boolean>;
  rowsWithoutIdentity: number;
  duplicateRows: number;
  verifiedNotInFunnel: number;
  snapshot: { stage: string; count: number }[];
  snapshotAt: string | null;
  window: { from: string | null; to: string | null };
}

export function computeCohorts(rows: FunnelRow[], verifiedBusinessIds: Set<string>): CohortResult {
  const seen = new Set<string>();
  const unique: FunnelRow[] = [];
  let duplicateRows = 0;
  let rowsWithoutIdentity = 0;
  for (const r of rows) {
    if (!r.contractor_id) { rowsWithoutIdentity++; unique.push(r); continue; }
    if (seen.has(r.contractor_id)) { duplicateRows++; continue; }
    seen.add(r.contractor_id);
    unique.push(r);
  }
  const instrumented = Object.fromEntries(
    FUNNEL_STAGES.map((s) => [s, unique.some((r) => !!r[s])]),
  ) as Record<FunnelStage, boolean>;

  const byMonth = new Map<string, FunnelRow[]>();
  for (const r of unique) {
    const m = torontoMonth(r.created_at);
    (byMonth.get(m) ?? byMonth.set(m, []).get(m)!).push(r);
  }
  const cohorts: Cohort[] = [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => ({
      month,
      size: list.length,
      verifiedPaid: list.filter((r) => r.contractor_id && verifiedBusinessIds.has(r.contractor_id)).length,
      stages: FUNNEL_STAGES.map((stage) => {
        const count = list.filter((r) => !!r[stage]).length;
        const known = instrumented[stage] && list.length > 0;
        return { stage, count, rate: known ? count / list.length : null, status: known ? "declared" : "unknown" } as CohortStageCell;
      }),
    }));

  const snap = new Map<string, number>();
  let snapshotAt: string | null = null;
  for (const r of unique) {
    const k = r.current_stage || "inconnu";
    snap.set(k, (snap.get(k) ?? 0) + 1);
    const u = r.updated_at ?? null;
    if (u && (!snapshotAt || u > snapshotAt)) snapshotAt = u;
  }
  const dates = unique.map((r) => r.created_at).sort();
  return {
    cohorts,
    instrumented,
    rowsWithoutIdentity,
    duplicateRows,
    verifiedNotInFunnel: [...verifiedBusinessIds].filter((id) => !seen.has(id)).length,
    snapshot: [...snap.entries()].map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count),
    snapshotAt,
    window: { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null },
  };
}

export interface FlowEventRow {
  step: string;
  status: string | null;
  prospect_id: string | null;
  email_present: boolean;
  email_key: string | null; // normalized, never displayed
  stripe_session_id: string | null;
  created_at: string;
}

export interface FlowStepStat {
  step: string;
  events: number;
  uniqueIdentities: number;
  eventsWithoutIdentity: number;
  uniqueSessions: number;
}

export function computeFlowEvents(rows: FlowEventRow[]): FlowStepStat[] {
  const map = new Map<string, { events: number; ids: Set<string>; noId: number; sess: Set<string> }>();
  for (const r of rows) {
    const s = map.get(r.step) ?? { events: 0, ids: new Set(), noId: 0, sess: new Set() };
    s.events++;
    const id = r.prospect_id ?? r.email_key;
    if (id) s.ids.add(id); else s.noId++;
    if (r.stripe_session_id) s.sess.add(r.stripe_session_id);
    map.set(r.step, s);
  }
  return [...map.entries()]
    .map(([step, s]) => ({ step, events: s.events, uniqueIdentities: s.ids.size, eventsWithoutIdentity: s.noId, uniqueSessions: s.sess.size }))
    .sort((a, b) => b.events - a.events);
}

/* --------------------------- unmet demand -------------------------- */

export interface DemandRow {
  source: "alex_no_match_cases" | "alex_waitlist_requests";
  id: string;
  session_id: string | null;
  user_id: string | null;
  service: string | null;
  city: string | null;
  status: string | null; // null = resolution not tracked by source
  created_at: string;
  synthetic: boolean;
}

export const RESOLVED_STATUSES = new Set(["resolved", "matched", "closed", "fulfilled", "cancelled", "canceled", "converted", "archived", "booked"]);
const SYNTHETIC_ID = /^(e2e|test|qa|synthetic|demo)[-_:]/i;

export function normalizeLabel(v: string | null | undefined): string {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function isSyntheticDemand(sessionId: string | null, marker?: unknown): boolean {
  return isTrue(marker) || (!!sessionId && SYNTHETIC_ID.test(sessionId));
}

export interface DemandPriority {
  key: string;
  service: string;
  city: string;
  events: number;
  uniqueDemands: number;
  unidentifiedEvents: number;
  sources: string[];
  firstSeen: string;
  lastSeen: string;
  resolutionTracked: boolean;
}

export interface DemandResult {
  priorities: DemandPriority[];
  excludedSynthetic: number;
  excludedResolved: number;
  missingServiceOrCity: number;
  totalEvents: number;
  window: { from: string | null; to: string | null };
}

export function computeDemand(rows: DemandRow[]): DemandResult {
  let excludedSynthetic = 0, excludedResolved = 0, missingServiceOrCity = 0;
  const groups = new Map<string, DemandPriority & { ids: Set<string>; srcs: Set<string> }>();
  const kept: DemandRow[] = [];
  for (const r of rows) {
    if (r.synthetic) { excludedSynthetic++; continue; }
    if (r.status && RESOLVED_STATUSES.has(r.status.toLowerCase())) { excludedResolved++; continue; }
    const s = normalizeLabel(r.service), c = normalizeLabel(r.city);
    if (!s || !c) { missingServiceOrCity++; continue; }
    kept.push(r);
    const key = `${s}|${c}`;
    const g = groups.get(key) ?? {
      key, service: r.service!.trim(), city: r.city!.trim(), events: 0, uniqueDemands: 0, unidentifiedEvents: 0,
      sources: [], firstSeen: r.created_at, lastSeen: r.created_at, resolutionTracked: false,
      ids: new Set<string>(), srcs: new Set<string>(),
    };
    g.events++;
    const identity = r.user_id ? `u:${r.user_id}` : r.session_id ? `s:${r.session_id}` : null;
    if (identity) g.ids.add(identity); else g.unidentifiedEvents++;
    g.srcs.add(r.source);
    if (r.status !== null) g.resolutionTracked = true;
    if (r.created_at < g.firstSeen) g.firstSeen = r.created_at;
    if (r.created_at > g.lastSeen) g.lastSeen = r.created_at;
    groups.set(key, g);
  }
  const priorities = [...groups.values()]
    .map(({ ids, srcs, ...g }) => ({ ...g, uniqueDemands: ids.size, sources: [...srcs].sort() }))
    .sort((a, b) => b.uniqueDemands - a.uniqueDemands || b.events - a.events || b.lastSeen.localeCompare(a.lastSeen));
  const dates = kept.map((r) => r.created_at).sort();
  return {
    priorities, excludedSynthetic, excludedResolved, missingServiceOrCity,
    totalEvents: kept.length,
    window: { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null },
  };
}

/* ----------------------------- insights ---------------------------- */

const money = (cents: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
const num = (n: number, d = 0) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

export function buildInsights(input: {
  entry: Entry350Result;
  pace: PaceResult;
  cohorts: CohortResult;
  demand: DemandResult;
  truncated: string[];
}): Insight[] {
  const { entry, pace, cohorts, demand, truncated } = input;
  const partial = truncated.length > 0;
  const ex = entry.excluded;
  const out: Insight[] = [];

  out.push({
    id: "entry350-goal",
    title: "Entreprises activées à 350 $ (preuve Stripe LIVE)",
    value: `${num(entry.verifiedBusinesses)} / ${num(pace.goal)} · ${money(entry.verifiedPretaxCents)} avant taxes`,
    provenance: ["contractor_activation_ledger", "stripe_webhook_events"],
    window: `Depuis le début des journaux → ${pace.today} (America/Toronto)`,
    evidence: partial ? "partial" : "verified",
    detail: `Écart ${num(pace.gap)} · ${num(pace.daysRemaining)} jours restants · rythme requis ${pace.requiredPerDay === null ? "—" : num(pace.requiredPerDay, 1)}/jour · observé ${num(pace.observedLast30PerDay, 2)}/jour (30 j).`,
    action: entry.verifiedBusinesses === 0
      ? "Obtenir la première activation LIVE vérifiée : prioriser les entreprises admissibles déjà au récapitulatif 350 $, envoi manuel seulement après les contrôles CASL existants."
      : "Comparer le rythme observé au rythme requis chaque semaine et concentrer l'effort sur la source des activations vérifiées.",
  });

  const unknownTotal = ex.unknownLivemode + ex.ledgerProofMissing + ex.ledgerIdentityMissing;
  out.push({
    id: "entry350-unknown",
    title: "Paiements ou droits sans preuve LIVE complète",
    value: `${num(unknownTotal)} inconnus · ${num(ex.livePaidWithoutActivation)} payés sans activation prouvée`,
    provenance: ["contractor_activation_ledger", "stripe_webhook_events"],
    window: "Tous les journaux disponibles",
    evidence: unknownTotal + ex.livePaidWithoutActivation > 0 ? "unknown" : "verified",
    detail: `Exclus de l'objectif : ${num(ex.test)} TEST/QA, ${num(ex.reversed)} remboursés/contestés, ${num(ex.unpaidOrPending)} non payés/en attente, ${num(entry.duplicateEvents)} événements dupliqués, ${num(entry.duplicatePaidSessionsSameBusiness)} 2e session même entreprise.`,
    action: ex.livePaidWithoutActivation > 0
      ? "Ouvrir /admin/stripe-verification et réconcilier chaque session LIVE payée sans droit d'activation; ne jamais activer manuellement sans webhook signé."
      : "Aucune réconciliation requise; conserver la règle de preuve actuelle.",
  });

  const otherSessions = entry.otherPaidOffers.reduce((s, o) => s + o.sessions, 0);
  out.push({
    id: "other-paid-offers",
    title: "Autres offres payées LIVE (hors objectif 350 $)",
    value: `${num(otherSessions)} sessions · ${money(entry.otherPaidOffers.reduce((s, o) => s + o.amountSubtotalCents, 0))} avant taxes`,
    provenance: ["stripe_webhook_events"],
    window: "Tous les journaux disponibles",
    evidence: partial ? "partial" : "verified",
    action: "Suivre séparément; ne pas additionner aux activations 350 $.",
  });

  const unknownStages = FUNNEL_STAGES.filter((s) => !cohorts.instrumented[s]);
  out.push({
    id: "cohort-tracking",
    title: "Cohortes mensuelles de prospects",
    value: `${num(cohorts.cohorts.length)} cohortes · ${num(cohorts.cohorts.reduce((s, c) => s + c.size, 0))} entreprises`,
    provenance: ["acquisition_funnel_state"],
    window: `${cohorts.window.from ? torontoDate(cohorts.window.from) : "—"} → ${cohorts.window.to ? torontoDate(cohorts.window.to) : "—"}`,
    evidence: unknownStages.length ? "partial" : "declared",
    detail: `Étapes non instrumentées (inconnues, pas zéro) : ${unknownStages.length ? unknownStages.join(", ") : "aucune"}. Horodatages paid/activated déclarés, non preuve de paiement. ${num(cohorts.verifiedNotInFunnel)} activations vérifiées sans ligne de cohorte.`,
    action: unknownStages.length
      ? "Brancher l'écriture des étapes inconnues dans le suivi existant avant d'interpréter un taux de conversion."
      : "Comparer les cohortes récentes à volume équivalent; aucune conclusion causale.",
  });

  const top = demand.priorities[0];
  out.push({
    id: "unmet-demand-top",
    title: "Demande non servie prioritaire",
    value: top ? `${top.service} · ${top.city} — ${num(top.uniqueDemands)} demandes uniques / ${num(top.events)} événements` : "Aucune demande non servie admissible",
    provenance: ["alex_no_match_cases", "alex_waitlist_requests"],
    window: `${demand.window.from ? torontoDate(demand.window.from) : "—"} → ${demand.window.to ? torontoDate(demand.window.to) : "—"}`,
    evidence: top && !top.resolutionTracked ? "partial" : "declared",
    detail: `Exclus : ${num(demand.excludedSynthetic)} synthétiques, ${num(demand.excludedResolved)} résolus, ${num(demand.missingServiceOrCity)} sans service/ville.`,
    action: top
      ? `Revoir les demandes ${top.service} à ${top.city} dans /admin/no-match-monitoring et vérifier manuellement l'offre existante. Aucun envoi ni changement de jumelage automatique.`
      : "Aucune action; continuer la collecte existante.",
  });

  return out;
}
