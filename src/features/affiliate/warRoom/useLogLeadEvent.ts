/**
 * Client-side helper to insert an affiliate lead event.
 * RLS ensures only the owning affiliate (or admin) can write.
 */
import { supabase } from "@/integrations/supabase/client";

export type LeadEventType =
  | "personal_sms_opened"
  | "personal_sms_confirmed_sent"
  | "personal_sms_not_sent"
  | "call_initiated"
  | "whatsapp_opened"
  | "email_sent"
  | "unpro_sms_dispatched"
  | "status_changed"
  | "note_added"
  | "link_copied"
  | "number_copied"
  | "message_copied";

export async function logLeadEvent(params: {
  affiliateId: string;
  leadId: string;
  eventType: LeadEventType;
  channel?: string;
  payload?: Record<string, unknown>;
}) {
  try {
    await (supabase as any).from("affiliate_lead_events").insert({
      affiliate_id: params.affiliateId,
      lead_id: params.leadId,
      event_type: params.eventType,
      channel: params.channel ?? null,
      payload: params.payload ?? {},
    });
  } catch (e) {
    // Never block the user's action on logging failure
    console.warn("[affiliate] event log failed", params.eventType, e);
  }
}
