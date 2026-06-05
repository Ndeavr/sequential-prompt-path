/**
 * UNPRO — Launch Mode client helpers.
 * Founder Mode bypass for quotas during the launch.
 */
import { supabase } from "@/integrations/supabase/client";

export interface LaunchModeState {
  mode: "idle" | "launching" | "paused" | "first_customer_acquired";
  founder_mode_enabled: boolean;
  started_at: string | null;
  first_customer_acquired_at: string | null;
  first_customer_contractor_id: string | null;
  first_customer_source: string | null;
  first_customer_message_template: string | null;
  first_customer_plan: string | null;
  first_customer_revenue_cents: number | null;
}

export async function getLaunchModeState(): Promise<LaunchModeState | null> {
  const { data } = await supabase.from("launch_mode_state" as any).select("*").eq("id", true).maybeSingle();
  return (data as unknown as LaunchModeState | null) ?? null;
}

export async function isFounderModeActive(): Promise<boolean> {
  const s = await getLaunchModeState();
  return !!(s?.founder_mode_enabled && s.mode !== "first_customer_acquired");
}

export async function setLaunchMode(mode: LaunchModeState["mode"]): Promise<void> {
  const patch: Record<string, unknown> = { mode };
  if (mode === "launching") patch.started_at = new Date().toISOString();
  if (mode === "paused") patch.paused_at = new Date().toISOString();
  const { error } = await supabase.from("launch_mode_state" as any).update(patch).eq("id", true);
  if (error) throw error;
}
