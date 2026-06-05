/**
 * UNPRO — Launch Mode shared helpers (Deno).
 * Single source of truth for launch state checks, transitions, and event logging.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const LAUNCH_STATES = [
  "DISCOVERED", "ENRICHING", "ENRICHED",
  "SCORING", "SCORED",
  "MESSAGING", "MESSAGED", "DELIVERED",
  "REPLIED",
  "CHECKOUT_SENT", "PAID", "ACTIVATED",
  "BLOCKED", "FAILED", "STOPPED",
] as const;
export type LaunchState = typeof LAUNCH_STATES[number];

const ALLOWED: Record<LaunchState, readonly LaunchState[]> = {
  DISCOVERED: ["ENRICHING", "BLOCKED", "FAILED", "STOPPED"],
  ENRICHING: ["ENRICHED", "FAILED", "BLOCKED"],
  ENRICHED: ["SCORING", "MESSAGING", "BLOCKED", "FAILED"],
  SCORING: ["SCORED", "FAILED"],
  SCORED: ["MESSAGING", "BLOCKED"],
  MESSAGING: ["MESSAGED", "BLOCKED", "FAILED"],
  MESSAGED: ["DELIVERED", "REPLIED", "FAILED", "STOPPED"],
  DELIVERED: ["REPLIED", "STOPPED"],
  REPLIED: ["CHECKOUT_SENT", "STOPPED", "BLOCKED"],
  CHECKOUT_SENT: ["PAID", "FAILED", "STOPPED"],
  PAID: ["ACTIVATED", "FAILED"],
  ACTIVATED: [],
  BLOCKED: ["ENRICHING", "MESSAGING", "STOPPED"],
  FAILED: ["ENRICHING", "MESSAGING", "STOPPED"],
  STOPPED: [],
};

export function canTransition(from: LaunchState, to: LaunchState) {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface LaunchModeState {
  mode: "idle" | "launching" | "paused" | "first_customer_acquired";
  founder_mode_enabled: boolean;
  first_customer_contractor_id: string | null;
}

export async function getLaunchState(): Promise<LaunchModeState> {
  const sb = adminClient();
  const { data, error } = await sb.from("launch_mode_state").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  return (data ?? { mode: "idle", founder_mode_enabled: true, first_customer_contractor_id: null }) as LaunchModeState;
}

export async function isLaunching(): Promise<boolean> {
  const s = await getLaunchState();
  return s.mode === "launching";
}

export async function isFounderModeActive(): Promise<boolean> {
  const s = await getLaunchState();
  return s.founder_mode_enabled && s.mode !== "first_customer_acquired";
}

export interface LogEventInput {
  lead_id?: string | null;
  contractor_id?: string | null;
  agent: string;
  event: string;
  from_state?: string | null;
  to_state?: string | null;
  success?: boolean;
  message?: string | null;
  payload?: Record<string, unknown>;
}

export async function logLaunchEvent(e: LogEventInput) {
  try {
    const sb = adminClient();
    await sb.from("launch_pipeline_events").insert({
      lead_id: e.lead_id ?? null,
      contractor_id: e.contractor_id ?? null,
      agent: e.agent,
      event: e.event,
      from_state: e.from_state ?? null,
      to_state: e.to_state ?? null,
      success: e.success ?? true,
      message: e.message ?? null,
      payload: e.payload ?? {},
    });
  } catch (err) {
    console.error("[launch] logLaunchEvent failed", err);
  }
}

export async function transitionLead(
  leadId: string,
  toState: LaunchState,
  patch: Record<string, unknown> = {},
  agent = "system",
) {
  const sb = adminClient();
  const { data: lead, error } = await sb.from("launch_leads").select("*").eq("id", leadId).maybeSingle();
  if (error || !lead) throw new Error(`lead not found: ${leadId}`);
  const fromState = lead.lead_status as LaunchState;
  if (!canTransition(fromState, toState)) {
    await logLaunchEvent({
      lead_id: leadId, contractor_id: lead.contractor_id, agent,
      event: "invalid_transition", from_state: fromState, to_state: toState, success: false,
      message: `Forbidden: ${fromState} → ${toState}`,
    });
    throw new Error(`Invalid transition: ${fromState} → ${toState}`);
  }
  const { error: upErr } = await sb.from("launch_leads").update({
    lead_status: toState,
    last_event_at: new Date().toISOString(),
    ...patch,
  }).eq("id", leadId);
  if (upErr) throw upErr;
  await logLaunchEvent({
    lead_id: leadId, contractor_id: lead.contractor_id, agent,
    event: "transition", from_state: fromState, to_state: toState,
  });
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
