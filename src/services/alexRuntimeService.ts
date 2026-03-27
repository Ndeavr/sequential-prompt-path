/**
 * AlexRuntimeService — Session lifecycle + orchestration.
 */

import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export class AlexRuntimeService {
  private sessionToken: string;
  private sessionId: string | null = null;

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

  async processTurn(userMessage: string, messageMode = "text", uiContext?: any) {
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
    return resp.json();
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
