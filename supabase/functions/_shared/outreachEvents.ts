// Thin wrappers around record_email_event / record_outreach_sms_event RPCs.
// Every outbound + every provider webhook MUST funnel through these to keep the funnel canonical.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return _sb;
}

export type EmailEventKind =
  | "sent" | "delivered" | "opened" | "clicked"
  | "replied" | "converted" | "bounced" | "complained";

export type SmsEventKind =
  | "sent" | "delivered" | "clicked"
  | "replied" | "converted" | "failed";

export async function recordEmailEvent(
  message_id: string,
  kind: EmailEventKind,
  payload: Record<string, unknown> = {},
): Promise<string | null> {
  if (!message_id) return null;
  try {
    const { data, error } = await sb().rpc("record_email_event", {
      p_message_id: message_id,
      p_kind: kind,
      p_payload: payload,
    });
    if (error) {
      console.error("[recordEmailEvent]", kind, message_id, error.message);
      return null;
    }
    return (data as string) ?? null;
  } catch (e) {
    console.error("[recordEmailEvent] threw", e);
    return null;
  }
}

export async function recordSmsEvent(
  message_sid: string,
  kind: SmsEventKind,
  payload: Record<string, unknown> = {},
): Promise<string | null> {
  if (!message_sid) return null;
  try {
    const { data, error } = await sb().rpc("record_outreach_sms_event", {
      p_sid: message_sid,
      p_kind: kind,
      p_payload: payload,
    });
    if (error) {
      console.error("[recordSmsEvent]", kind, message_sid, error.message);
      return null;
    }
    return (data as string) ?? null;
  } catch (e) {
    console.error("[recordSmsEvent] threw", e);
    return null;
  }
}
