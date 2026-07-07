/**
 * AlexRuntimeService — Session lifecycle + orchestration.
 */

import { supabase } from "@/integrations/supabase/client";
import { getAlexFlag } from "@/lib/alexFeatureFlags";
import { recordMemoryTurn } from "@/hooks/useHomeownerDNA";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export class AlexRuntimeService {
  private sessionToken: string;
  private sessionId: string | null = null;
  private lastAlexQuestion: string = "";

  constructor(existingToken?: string) {
    this.sessionToken = existingToken || crypto.randomUUID();
  }

  get token() { return this.sessionToken; }
  get id() { return this.sessionId; }

  async startSession(userId?: string, entrypoint?: string) {
    const token = await getAuthToken();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-start-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_token: this.sessionToken, user_id: userId, entrypoint }),
    });
    const data = await resp.json();
    this.sessionId = data.session_id;
    return data;
  }

  async processTurn(userMessage: string, messageMode = "text", uiContext?: any, userId?: string | null) {
    const token = await getAuthToken();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-process-turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        session_token: this.sessionToken,
        session_id: this.sessionToken,
        user_message: userMessage,
        message_mode: messageMode,
        ui_context: uiContext,
      }),
    });
    const data = await resp.json();

    // Fire-and-forget: feed the memory extractor. Never blocks the chat UX.
    if (userId && getAlexFlag("compat_memory_engine_v1")) {
      const prevQuestion = this.lastAlexQuestion;
      void Promise.resolve().then(() =>
        recordMemoryTurn({
          user_id: userId,
          session_id: this.sessionToken,
          question: prevQuestion,
          answer: userMessage,
          source: "alex_runtime",
        })
      );
    }
    this.lastAlexQuestion = data?.alex_question ?? data?.assistant_message ?? data?.message ?? "";

    return data;
  }

  async resumeAfterAuth(userId: string) {
    const token = await getAuthToken();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-resume-after-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_token: this.sessionToken, user_id: userId }),
    });
    return resp.json();
  }
}
