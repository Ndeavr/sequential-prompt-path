/**
 * UNPRO — Canonical server-side funnel logger.
 *
 * Single writer for `public.contractor_funnel_events` from edge functions.
 * Every outbound message, provider status callback and click MUST call this,
 * otherwise the acquisition funnel has no measurable "sent / delivered /
 * failed / clicked" stage (this was the real gap: 0 rows for those stages).
 *
 * Rules:
 *  - A message is only "delivered" when the provider confirms it.
 *  - Every event carries a dedupe key → the DB unique index drops repeats.
 *  - Never throws: telemetry must never break a send.
 */
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

export type ServerFunnelEventType =
  | "sms_queued"
  | "sms_sent"
  | "sms_delivered"
  | "sms_failed"
  | "sms_clicked"
  | "email_queued"
  | "email_sent"
  | "email_delivered"
  | "email_failed"
  | "email_clicked"
  | "outreach_blocked"
  | "landing_view"
  | "cta_click";

export interface ServerFunnelEvent {
  event_type: ServerFunnelEventType;
  channel?: "sms" | "email" | "web" | null;
  provider?: "twilio" | "resend" | "app" | null;
  provider_message_id?: string | null;
  template_key?: string | null;
  template_version?: string | null;
  campaign?: string | null;
  prospect_id?: string | null;
  contractor_id?: string | null;
  phone?: string | null;
  email?: string | null;
  session_id?: string | null;
  affiliate_code?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  failure_reason?: string | null;
  is_test?: boolean;
  metadata?: Record<string, unknown>;
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Deterministic key so a retried webhook never inflates the funnel. */
export function funnelDedupeKey(e: ServerFunnelEvent): string {
  const subject = e.provider_message_id
    ?? e.prospect_id
    ?? e.contractor_id
    ?? e.session_id
    ?? e.phone
    ?? e.email
    ?? "anon";
  return `${e.event_type}:${e.channel ?? "na"}:${subject}`;
}

export async function logServerFunnelEvent(e: ServerFunnelEvent): Promise<boolean> {
  try {
    const environment = Deno.env.get("UNPRO_ENV")
      ?? (Deno.env.get("SUPABASE_URL")?.includes("localhost") ? "local" : "production");

    const { error } = await sb()
      .from("contractor_funnel_events")
      .upsert({
        event_type: e.event_type,
        step: e.event_type,
        channel: e.channel ?? null,
        provider: e.provider ?? null,
        provider_message_id: e.provider_message_id ?? null,
        template_version: e.template_version ?? e.template_key ?? null,
        environment,
        failure_reason: e.failure_reason ?? null,
        dedupe_key: funnelDedupeKey(e),
        prospect_id: isUuid(e.prospect_id) ? e.prospect_id : null,
        contractor_id: isUuid(e.contractor_id) ? e.contractor_id : null,
        phone: e.phone ?? null,
        email: e.email ?? null,
        session_id: e.session_id ?? null,
        affiliate_code: e.affiliate_code ?? null,
        utm_source: e.utm_source ?? null,
        utm_medium: e.utm_medium ?? null,
        utm_campaign: e.utm_campaign ?? e.campaign ?? null,
        event_source: "edge",
        source: e.provider ?? "edge",
        is_test: e.is_test === true,
        metadata: {
          ...(e.metadata ?? {}),
          template_key: e.template_key ?? null,
          campaign: e.campaign ?? null,
          prospect_ref: isUuid(e.prospect_id) ? null : (e.prospect_id ?? null),
        },
      }, { onConflict: "dedupe_key", ignoreDuplicates: true });

    if (error) {
      console.error("[funnelEvents]", e.event_type, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[funnelEvents] threw", err);
    return false;
  }
}
