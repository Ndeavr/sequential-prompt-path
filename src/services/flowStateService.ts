/**
 * UNPRO — Flow State Persistence Service
 * Manages stateful flows (AIPP analysis, onboarding) with session persistence.
 * Supports guest → authenticated promotion and cross-session continuity.
 */
import { supabase } from "@/integrations/supabase/client";

const FLOW_TOKEN_KEY = "unpro_flow_session_token";

export type FlowType = "AIPP_ANALYSIS";
export type FlowStep = "loading" | "analysis_ready" | "objectives_pending" | "plan_ready" | "completed";
export type FlowStatus = "in_progress" | "completed";

export interface FlowSession {
  id: string;
  session_token: string;
  user_id: string | null;
  contractor_id: string | null;
  flow_type: string;
  step: string;
  status: string;
  input_payload: Record<string, unknown>;
  lead_id: string | null;
  score_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Step → route mapping
const STEP_ROUTES: Record<string, string> = {
  loading: "/entrepreneur/analysis/loading",
  analysis_ready: "/entrepreneur/score",
  objectives_pending: "/entrepreneur/pricing",
  plan_ready: "/entrepreneur/pricing",
  completed: "/pro",
};

export function getStepRoute(step: string): string {
  return STEP_ROUTES[step] || "/entrepreneur/score";
}

// ─── Token Management ───

export function getFlowToken(): string | null {
  try {
    return sessionStorage.getItem(FLOW_TOKEN_KEY) || localStorage.getItem(FLOW_TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string): void {
  try {
    sessionStorage.setItem(FLOW_TOKEN_KEY, token);
    localStorage.setItem(FLOW_TOKEN_KEY, token);
  } catch {}
}

export function clearFlowToken(): void {
  try {
    sessionStorage.removeItem(FLOW_TOKEN_KEY);
    localStorage.removeItem(FLOW_TOKEN_KEY);
  } catch {}
}

// ─── Create Session ───

export async function createFlowSession(params: {
  flowType: FlowType;
  inputPayload: Record<string, unknown>;
  userId?: string | null;
  leadId?: string;
}): Promise<FlowSession | null> {
  const token = crypto.randomUUID();

  const { data, error } = await supabase
    .from("user_flow_sessions")
    .insert({
      session_token: token,
      flow_type: params.flowType,
      step: "loading",
      status: "in_progress",
      input_payload: params.inputPayload,
      user_id: params.userId || null,
      lead_id: params.leadId || null,
    } as never)
    .select()
    .single();

  if (error || !data) return null;

  persistToken(token);
  return data as unknown as FlowSession;
}

// ─── Get Active Session ───

export async function getActiveFlowSession(flowType?: FlowType): Promise<FlowSession | null> {
  const token = getFlowToken();
  if (!token) return null;

  let query = supabase
    .from("user_flow_sessions")
    .select("*")
    .eq("session_token", token)
    .eq("status", "in_progress");

  if (flowType) {
    query = query.eq("flow_type", flowType);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).single();

  if (error || !data) return null;

  // Expire after 24h
  const session = data as unknown as FlowSession;
  const age = Date.now() - new Date(session.created_at).getTime();
  if (age > 24 * 60 * 60 * 1000) {
    await updateFlowStep(session.id, "loading", "completed");
    clearFlowToken();
    return null;
  }

  return session;
}

// ─── Update Step ───

export async function updateFlowStep(
  sessionId: string,
  step: string,
  status?: FlowStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const update: Record<string, unknown> = { step };
  if (status) update.status = status;
  if (extra) Object.assign(update, extra);

  await supabase
    .from("user_flow_sessions")
    .update(update as never)
    .eq("id", sessionId);
}

// ─── Update Score Snapshot ───

export async function updateFlowScoreSnapshot(
  sessionId: string,
  scoreSnapshot: Record<string, unknown>
): Promise<void> {
  await supabase
    .from("user_flow_sessions")
    .update({ score_snapshot: scoreSnapshot, step: "analysis_ready" } as never)
    .eq("id", sessionId);
}

// ─── Promote Guest → Authenticated ───

export async function promoteFlowSession(userId: string): Promise<FlowSession | null> {
  const token = getFlowToken();
  if (!token) return null;

  const { data, error } = await supabase
    .from("user_flow_sessions")
    .update({ user_id: userId } as never)
    .eq("session_token", token)
    .is("user_id", null)
    .select()
    .single();

  if (error || !data) return null;
  return data as unknown as FlowSession;
}

// ─── Complete Flow ───

export async function completeFlow(sessionId: string): Promise<void> {
  await updateFlowStep(sessionId, "completed", "completed");
  clearFlowToken();
}
