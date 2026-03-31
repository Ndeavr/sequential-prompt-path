/**
 * UNPRO — Flow State Persistence Service
 * Manages stateful flows (AIPP analysis, onboarding) with session persistence.
 * Supports guest → authenticated promotion and cross-session continuity.
 */
import { supabase } from "@/integrations/supabase/client";

const FLOW_TOKEN_KEY = "unpro_flow_session_token";
const FLOW_FALLBACK_KEY = "unpro_flow_session_fallback";

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

function readFallbackSession(): FlowSession | null {
  try {
    const raw = sessionStorage.getItem(FLOW_FALLBACK_KEY) || localStorage.getItem(FLOW_FALLBACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlowSession;
  } catch {
    return null;
  }
}

function persistFallbackSession(session: FlowSession): void {
  try {
    const raw = JSON.stringify(session);
    sessionStorage.setItem(FLOW_FALLBACK_KEY, raw);
    localStorage.setItem(FLOW_FALLBACK_KEY, raw);
  } catch {}
}

function clearFallbackSession(): void {
  try {
    sessionStorage.removeItem(FLOW_FALLBACK_KEY);
    localStorage.removeItem(FLOW_FALLBACK_KEY);
  } catch {}
}

function isExpired(session: FlowSession): boolean {
  const age = Date.now() - new Date(session.created_at).getTime();
  return age > 24 * 60 * 60 * 1000;
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
  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const localSession: FlowSession = {
    id,
    session_token: token,
    user_id: params.userId || null,
    contractor_id: null,
    flow_type: params.flowType,
    step: "loading",
    status: "in_progress",
    input_payload: params.inputPayload,
    lead_id: params.leadId || null,
    score_snapshot: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  persistToken(token);
  persistFallbackSession(localSession);

  const { error } = await supabase
    .from("user_flow_sessions")
    .insert({
      id,
      session_token: token,
      flow_type: params.flowType,
      step: "loading",
      status: "in_progress",
      input_payload: params.inputPayload,
      user_id: params.userId || null,
      lead_id: params.leadId || null,
      score_snapshot: null,
    } as never);

  if (error) {
    console.error("createFlowSession failed, using local fallback:", error);
  }

  return localSession;
}

// ─── Get Active Session ───

export async function getActiveFlowSession(flowType?: FlowType): Promise<FlowSession | null> {
  const token = getFlowToken();
  const fallback = readFallbackSession();

  if (!token && !fallback) return null;

  if (!token && fallback) {
    if (isExpired(fallback)) {
      clearFallbackSession();
      clearFlowToken();
      return null;
    }

    if (!flowType || fallback.flow_type === flowType) {
      return fallback;
    }

    return null;
  }

  let query = supabase
    .from("user_flow_sessions")
    .select("*")
    .eq("session_token", token as string)
    .eq("status", "in_progress");

  if (flowType) {
    query = query.eq("flow_type", flowType);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (error || !data) {
    if (fallback && (!flowType || fallback.flow_type === flowType) && !isExpired(fallback)) {
      return fallback;
    }
    return null;
  }

  const session = data as unknown as FlowSession;
  if (isExpired(session)) {
    await updateFlowStep(session.id, "loading", "completed");
    clearFlowToken();
    clearFallbackSession();
    return null;
  }

  persistFallbackSession(session);

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

  const fallback = readFallbackSession();
  if (fallback && fallback.id === sessionId) {
    persistFallbackSession({
      ...fallback,
      ...update,
      updated_at: new Date().toISOString(),
    } as FlowSession);
  }

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
  const fallback = readFallbackSession();
  if (fallback && fallback.id === sessionId) {
    persistFallbackSession({
      ...fallback,
      score_snapshot: scoreSnapshot,
      step: "analysis_ready",
      updated_at: new Date().toISOString(),
    });
  }

  await supabase
    .from("user_flow_sessions")
    .update({ score_snapshot: scoreSnapshot, step: "analysis_ready" } as never)
    .eq("id", sessionId);
}

// ─── Promote Guest → Authenticated ───

export async function promoteFlowSession(userId: string): Promise<FlowSession | null> {
  const token = getFlowToken();
  const fallback = readFallbackSession();

  if (fallback) {
    persistFallbackSession({
      ...fallback,
      user_id: userId,
      updated_at: new Date().toISOString(),
    });
  }

  if (!token) return fallback;

  const { data, error } = await supabase
    .from("user_flow_sessions")
    .update({ user_id: userId } as never)
    .eq("session_token", token)
    .is("user_id", null)
    .select()
    .maybeSingle();

  if (error || !data) return fallback;

  const session = data as unknown as FlowSession;
  persistFallbackSession(session);
  return session;
}

// ─── Complete Flow ───

export async function completeFlow(sessionId: string): Promise<void> {
  await updateFlowStep(sessionId, "completed", "completed");
  clearFlowToken();
  clearFallbackSession();
}
