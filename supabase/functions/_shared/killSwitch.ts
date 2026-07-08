// killSwitch.ts — shared runtime kill-switch reader for outreach senders.
// Any sender must call `isOutreachEnabled(sb)` before hitting a provider.
// The switch lives in public.system_flags (key = 'OUTREACH_ENABLED').
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export async function isFlagEnabled(sb: SupabaseClient, key: string): Promise<boolean> {
  const { data } = await sb
    .from("system_flags")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return !!data?.value;
}

export async function isOutreachEnabled(sb: SupabaseClient): Promise<boolean> {
  return isFlagEnabled(sb, "OUTREACH_ENABLED");
}
