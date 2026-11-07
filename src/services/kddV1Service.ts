/**
 * KDD v1 loader — read-only SELECTs on existing admin-RLS tables.
 * Server-side authorization: has_role(auth.uid(),'admin') is confirmed first,
 * and every table below is admin-only under existing RLS. Only aggregate-safe
 * columns are selected (no names, emails, phones or raw payment payloads).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  buildInsights, computeCohorts, computeDemand, computeEntry350, computeFlowEvents, computePace,
  isSyntheticDemand, normalizeLabel,
  type DemandRow, type FlowEventRow, type FunnelRow, type LedgerRow, type WebhookRow,
} from "@/lib/kdd/kddV1";

const PAGE = 1000;
const MAX_PAGES = 20;

export class KddAccessDeniedError extends Error {
  constructor() { super("Accès réservé aux administrateurs."); }
}

async function readAll<T>(table: string, select: string, truncated: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select(select)
      .order("created_at", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return out;
  }
  truncated.push(table);
  return out;
}

export async function loadKddV1(now = new Date()) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new KddAccessDeniedError();
  const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (roleErr || isAdmin !== true) throw new KddAccessDeniedError();

  const truncated: string[] = [];
  const [webhooks, ledger, funnel, flowRaw, noMatchRaw, waitlistRaw] = await Promise.all([
    readAll<WebhookRow>(
      "stripe_webhook_events",
      [
        "stripe_event_id", "event_type", "livemode", "session_id", "payment_intent_id", "created_at",
        "payment_status:payload->data->object->>payment_status",
        "amount_subtotal:payload->data->object->>amount_subtotal",
        "currency:payload->data->object->>currency",
        "offer:payload->data->object->metadata->>offer",
        "test_mode:payload->data->object->metadata->>test_mode",
        "e2e_test:payload->data->object->metadata->>e2e_test",
        "obj_payment_intent:payload->data->object->>payment_intent",
      ].join(","),
      truncated,
    ),
    readAll<LedgerRow>(
      "contractor_activation_ledger",
      "contractor_id,action,source,created_at,meta_livemode:metadata->>livemode,meta_event_id:metadata->>stripe_event_id,meta_session_id:metadata->>stripe_session_id",
      truncated,
    ),
    readAll<FunnelRow>(
      "acquisition_funnel_state",
      "contractor_id,created_at,updated_at,current_stage,contacted_at,delivered_at,opened_at,clicked_at,registered_at,onboarded_at,paid_at,activated_at",
      truncated,
    ),
    readAll<{ step: string; status: string | null; prospect_id: string | null; email: string | null; stripe_session_id: string | null; created_at: string }>(
      "activation_flow_events", "step,status,prospect_id,email,stripe_session_id,created_at", truncated,
    ),
    readAll<{ id: string; alex_session_id: string | null; service: string | null; city: string | null; created_at: string; e2e: string | null }>(
      "alex_no_match_cases", "id,alex_session_id,service,city,created_at,e2e:constraints_json->>e2e_test", truncated,
    ),
    readAll<{ id: string; alex_session_id: string | null; user_id: string | null; service: string | null; city: string | null; status: string | null; created_at: string }>(
      "alex_waitlist_requests", "id,alex_session_id,user_id,service,city,status,created_at", truncated,
    ),
  ]);

  const entry = computeEntry350(webhooks, ledger);
  const verifiedSet = new Set(entry.verifiedBusinessIds);

  const flow: FlowEventRow[] = flowRaw.map((r) => ({
    step: r.step, status: r.status, prospect_id: r.prospect_id,
    email_present: !!r.email, email_key: r.email ? normalizeLabel(r.email) : null,
    stripe_session_id: r.stripe_session_id, created_at: r.created_at,
  }));
  const demandRows: DemandRow[] = [
    ...noMatchRaw.map((r) => ({
      source: "alex_no_match_cases" as const, id: r.id, session_id: r.alex_session_id, user_id: null,
      service: r.service, city: r.city, status: null, created_at: r.created_at,
      synthetic: isSyntheticDemand(r.alex_session_id, r.e2e),
    })),
    ...waitlistRaw.map((r) => ({
      source: "alex_waitlist_requests" as const, id: r.id, session_id: r.alex_session_id, user_id: r.user_id,
      service: r.service, city: r.city, status: r.status ?? "", created_at: r.created_at,
      synthetic: isSyntheticDemand(r.alex_session_id),
    })),
  ];

  const pace = computePace(entry.verifiedBusinesses, entry.verifiedDates, now);
  const cohorts = computeCohorts(funnel, verifiedSet);
  const demand = computeDemand(demandRows);
  const flowSteps = computeFlowEvents(flow);
  return {
    generatedAt: now.toISOString(),
    entry: { ...entry, verifiedBusinessIds: undefined }, pace, cohorts, demand, flowSteps, truncated,
    insights: buildInsights({ entry, pace, cohorts, demand, truncated }),
    unreadable: ["pricing_payment_events (RLS service-only)"],
  };
}

export type KddV1Data = Awaited<ReturnType<typeof loadKddV1>>;
