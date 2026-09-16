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

export class OutreachEventError extends Error {
  constructor(public channel: "email" | "sms", public kind: string, public ref: string, message: string) {
    super(`[${channel}:${kind}] ${ref}: ${message}`);
    this.name = "OutreachEventError";
  }
}

export type RecordOptions = {
  /** Webhooks: propagate the failure so the provider retries instead of losing the event. */
  strict?: boolean;
};

/** Never lose an event silently: persist the failure, then surface it when strict. */
async function reportEventFailure(
  channel: "email" | "sms",
  kind: string,
  ref: string,
  message: string,
  payload: Record<string, unknown>,
) {
  console.error(`[record${channel === "email" ? "Email" : "Sms"}Event]`, kind, ref, message);
  try {
    await sb().from("platform_operation_outcomes").insert({
      operation: `outreach_event_${channel}`,
      intent: kind,
      business_outcome: "failed",
      failure_code: "EVENT_WRITE_FAILED",
      affected_record: ref,
      service: channel === "email" ? "resend" : "twilio",
      next_action: "Vérifier les droits d'écriture du journal de prospection puis rejouer l'événement.",
      payload: { kind, ref, message, payload },
    });
  } catch (e) {
    console.error("[reportEventFailure] threw", e);
  }
}

export async function recordEmailEvent(
  message_id: string,
  kind: EmailEventKind,
  payload: Record<string, unknown> = {},
  opts: RecordOptions = {},
): Promise<string | null> {
  if (!message_id) {
    if (opts.strict) throw new OutreachEventError("email", kind, "(missing id)", "message_id manquant");
    return null;
  }
  let message: string;
  try {
    const { data, error } = await sb().rpc("record_email_event", {
      p_message_id: message_id,
      p_kind: kind,
      p_payload: payload,
    });
    if (!error) return (data as string) ?? null;
    message = error.message;
  } catch (e) {
    message = e instanceof Error ? e.message : String(e);
  }
  await reportEventFailure("email", kind, message_id, message, payload);
  if (opts.strict) throw new OutreachEventError("email", kind, message_id, message);
  return null;
}

export async function recordSmsEvent(
  message_sid: string,
  kind: SmsEventKind,
  payload: Record<string, unknown> = {},
  opts: RecordOptions = {},
): Promise<string | null> {
  if (!message_sid) {
    if (opts.strict) throw new OutreachEventError("sms", kind, "(missing sid)", "message_sid manquant");
    return null;
  }
  let message: string;
  try {
    const { data, error } = await sb().rpc("record_outreach_sms_event", {
      p_sid: message_sid,
      p_kind: kind,
      p_payload: payload,
    });
    if (!error) return (data as string) ?? null;
    message = error.message;
  } catch (e) {
    message = e instanceof Error ? e.message : String(e);
  }
  await reportEventFailure("sms", kind, message_sid, message, payload);
  if (opts.strict) throw new OutreachEventError("sms", kind, message_sid, message);
  return null;
}
