// Smart Contact Router SDK — one entrypoint for all UNPRO outbound communications.
import { supabase } from "@/integrations/supabase/client";

export type RouterChannel = "sms" | "email";

export interface ContactPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  sms_consent?: boolean;
  email_consent?: boolean;
}

export interface SendViaRouterParams {
  contactId?: string;
  contact?: ContactPayload;
  templateKey: string;
  templateData?: Record<string, unknown>;
  smsBody?: string;
  emailSubject?: string;
  emailHtml?: string;
  channelOverride?: RouterChannel;
  idempotencyKey?: string;
}

export interface RouterResult {
  ok: boolean;
  channel_used?: RouterChannel;
  fallback_scheduled?: boolean;
  fallback_used?: boolean;
  log_id?: string;
  duplicate?: boolean;
  reason?: string;
}

export async function sendViaRouter(p: SendViaRouterParams): Promise<RouterResult> {
  const { data, error } = await supabase.functions.invoke("contact-router", {
    body: {
      contact_id: p.contactId,
      contact: p.contact,
      template_key: p.templateKey,
      template_data: p.templateData,
      sms_body: p.smsBody,
      email_subject: p.emailSubject,
      email_html: p.emailHtml,
      channel_override: p.channelOverride,
      idempotency_key: p.idempotencyKey,
    },
  });
  if (error) return { ok: false, reason: error.message };
  return data as RouterResult;
}
