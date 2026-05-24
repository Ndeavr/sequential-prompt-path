import { supabase } from "@/integrations/supabase/client";
import type { DiagnosticInputs } from "./types";

const KEY = "unpro_growth_diagnostic_v1";
const TOKEN_KEY = "unpro_growth_diagnostic_guest_token";

export function getGuestToken(): string {
  let t = sessionStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID();
    sessionStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export function loadLocal(): { id?: string; inputs: DiagnosticInputs; step?: string } {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { inputs: {} };
    return JSON.parse(raw);
  } catch {
    return { inputs: {} };
  }
}

export function saveLocal(state: { id?: string; inputs: DiagnosticInputs; step?: string }) {
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

export async function createOrUpdateDiagnostic(
  id: string | undefined,
  inputs: DiagnosticInputs,
  step: string,
  extras: { recommended_plan?: string; projected_revenue?: number; projected_loss_monthly?: number } = {},
): Promise<string | undefined> {
  const { data: auth } = await supabase.auth.getUser();
  const user_id = auth.user?.id ?? null;
  const guest_token = user_id ? null : getGuestToken();

  const row: any = {
    ...inputs,
    current_step: step,
    user_id,
    guest_token,
    ...extras,
  };

  try {
    if (id) {
      const { error } = await (supabase as any).from("growth_diagnostics").update(row).eq("id", id);
      if (error) throw error;
      return id;
    }
    const { data, error } = await (supabase as any).from("growth_diagnostics").insert(row).select("id").single();
    if (error) throw error;
    return data?.id;
  } catch (e) {
    console.warn("[growthDiagnostic] persist failed (non-blocking)", e);
    return id;
  }
}

export async function logEvent(diagnostic_id: string | undefined, event_type: string, payload: any = {}) {
  if (!diagnostic_id) return;
  try {
    await (supabase as any).from("growth_diagnostic_events").insert({ diagnostic_id, event_type, payload });
  } catch {
    // non-blocking
  }
}
