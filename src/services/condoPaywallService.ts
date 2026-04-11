/**
 * Condo Paywall Service — tracks free actions & triggers paywall
 */
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "unpro_condo_actions_count";
export const FREE_ACTION_LIMIT = 3;

export function getCompletedActionsCount(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

export function incrementActionCount(): number {
  const next = getCompletedActionsCount() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {}
  return next;
}

export function shouldShowPaywall(): boolean {
  return getCompletedActionsCount() >= FREE_ACTION_LIMIT;
}

export function resetActionCount(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export async function logPaywallEvent(
  triggerType: "action_limit" | "feature_gate" | "alex_suggestion",
  context: Record<string, unknown> = {},
  syndicateId?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase as any).from("paywall_events").insert({
    user_id: user.id,
    syndicate_id: syndicateId || null,
    trigger_type: triggerType,
    trigger_context: context,
    converted: false,
  });
}

export async function markPaywallConverted(eventId: string): Promise<void> {
  // Since we only have insert policy, we track conversion as a new event
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase as any).from("paywall_events").insert({
    user_id: user.id,
    trigger_type: "action_limit",
    trigger_context: { converted_from: eventId },
    converted: true,
  });
}
