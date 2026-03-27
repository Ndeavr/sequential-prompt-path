/**
 * AlexAnalyticsService — KPIs, summaries, debugging metrics.
 */

import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export interface AlexAnalyticsSummary {
  avgResponseLatencyMs: number;
  slaRespectRate: number;
  totalSessions: number;
  guestSessionsConverted: number;
  calendarOpens: number;
  noResultEvents: number;
  uiFailures: number;
  noResultRate: number;
  topIntents: Array<{ intent: string; count: number }>;
  topObjections: Array<{ type: string; count: number }>;
}

export class AlexAnalyticsService {
  async fetchSummary(): Promise<AlexAnalyticsSummary | null> {
    const token = await getAuthToken();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-admin-analytics-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      avgResponseLatencyMs: data.avg_response_latency_ms,
      slaRespectRate: data.sla_respect_rate,
      totalSessions: data.total_sessions,
      guestSessionsConverted: data.guest_sessions_converted,
      calendarOpens: data.calendar_opens,
      noResultEvents: data.no_result_events,
      uiFailures: data.ui_failures,
      noResultRate: data.no_result_rate,
      topIntents: data.top_intents,
      topObjections: data.top_objections,
    };
  }

  async logUIFailure(sessionId: string, failureType: string, expectedEvent: string, actualEvent?: string, screenName?: string) {
    await (supabase.from("alex_ui_failures") as any).insert({
      session_id: sessionId,
      failure_type: failureType,
      expected_ui_event: expectedEvent,
      actual_ui_event: actualEvent || null,
      screen_name: screenName || null,
    });
  }

  async logLatency(sessionId: string, eventName: string, latencyMs: number) {
    await (supabase.from("alex_response_latency") as any).insert({
      session_id: sessionId,
      event_name: eventName,
      latency_ms: latencyMs,
      is_sla_respected: latencyMs < 2000,
    });
  }
}

export const alexAnalyticsService = new AlexAnalyticsService();
