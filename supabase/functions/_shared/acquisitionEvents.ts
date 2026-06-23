// UNPRO — Shared acquisition event logger (Deno / Edge Functions)
// Single source of truth for funnel telemetry.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AcqChannel = "sms" | "email" | "manual" | "system" | "web" | "stripe";
export type AcqEventType =
  | "scraped" | "contacted" | "sent" | "delivered" | "opened" | "clicked"
  | "registered" | "onboarded" | "paid" | "active"
  | "failed" | "bounced" | "unsubscribed";
export type AcqProvider = "twilio" | "resend" | "stripe" | "app" | "system";

export interface AcqEventInput {
  prospect_id?: string | null;
  contractor_id?: string | null;
  profile_id?: string | null;
  tracking_id?: string | null;
  channel: AcqChannel;
  event_type: AcqEventType;
  provider?: AcqProvider | null;
  provider_event_id?: string | null;
  source_table?: string | null;
  source_row_id?: string | null;
  metadata?: Record<string, unknown>;
  occurred_at?: string;
}

let cachedClient: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  cachedClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return cachedClient;
}

/** Fire-and-forget: never throws. Idempotent on (provider, provider_event_id) and (source_table, source_row_id, event_type). */
export async function logAcquisitionEvent(input: AcqEventInput): Promise<void> {
  try {
    const supa = client();
    await supa.from("acquisition_events").upsert({
      prospect_id: input.prospect_id ?? null,
      contractor_id: input.contractor_id ?? null,
      profile_id: input.profile_id ?? null,
      tracking_id: input.tracking_id ?? null,
      channel: input.channel,
      event_type: input.event_type,
      provider: input.provider ?? null,
      provider_event_id: input.provider_event_id ?? null,
      source_table: input.source_table ?? null,
      source_row_id: input.source_row_id ?? null,
      metadata: input.metadata ?? {},
      occurred_at: input.occurred_at ?? new Date().toISOString(),
    }, { onConflict: input.provider_event_id ? "provider,provider_event_id" : "source_table,source_row_id,event_type", ignoreDuplicates: true });
  } catch (err) {
    console.error("[acquisitionEvents] insert failed:", err);
  }
}
