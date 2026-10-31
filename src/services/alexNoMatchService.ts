/**
 * AlexNoMatchService — handles no-match detection, waitlist, retry, and admin stats.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildNoMatchTitle, buildAlexVoiceLine } from "@/lib/noMatchCopy";
import { canRetainNoMatch, normalizeNoMatchService } from "@/lib/demand/noMatchPolicy";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Connectez-vous pour conserver votre demande.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export interface NoMatchCase {
  alex_session_id: string;
  service: string;
  city: string;
  radius_km?: number;
  constraints?: Record<string, unknown>;
  detected_reason?: string;
}

export interface WaitlistRequest {
  project_id?: string;
  follow_up_consent?: boolean;
  alex_session_id: string;
  user_id?: string;
  first_name?: string;
  phone?: string;
  email?: string;
  service: string;
  city: string;
  radius_km?: number;
  flexibility_level?: string;
  urgency_level?: string;
}

export interface NoMatchStats {
  total_no_match_cases: number;
  active_waitlist: number;
  matched_waitlist: number;
  conversion_rate: string;
  avg_retries: string | number;
  top_services: [string, number][];
  top_cities: [string, number][];
}

export class AlexNoMatchService {
  async detectNoMatch(data: NoMatchCase): Promise<{ case_id: string }> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-no-match-handle`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "detect", ...data }),
    });
    const result = await resp.json();
    if (!resp.ok || result.ok !== true || !result.case_id) throw new Error("Votre demande n’a pas été conservée. Vous pouvez continuer avec Clara.");
    return result;
  }

  async createWaitlist(data: WaitlistRequest): Promise<{ waitlist_id: string }> {
    if (!canRetainNoMatch({ consent: data.follow_up_consent, projectId: data.project_id, contact: data.email || data.phone })) throw new Error("Confirmez votre projet, votre accord et un moyen de contact.");
    const headers = await getAuthHeaders();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-no-match-handle`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "waitlist-create", ...data, service: normalizeNoMatchService(data.service) }),
    });
    const result = await resp.json();
    if (!resp.ok || result.ok !== true || !result.waitlist_id) throw new Error("Votre demande n’a pas été conservée. Vous pouvez continuer avec Clara.");
    return result;
  }

  async getStats(): Promise<NoMatchStats> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-no-match-handle`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "stats" }),
    });
    if (!resp.ok) throw new Error("Le suivi n’est pas disponible pour le moment.");
    return resp.json();
  }

  getNoMatchCopy(_reason?: string): string {
    return "Avec votre accord, votre demande peut être conservée pour un suivi.";
  }

  getAlexVoiceResponse(service: string, city: string): string {
    return `${buildNoMatchTitle({ service, city })} ${buildAlexVoiceLine({ service, city })}`;
  }
}

export const alexNoMatchService = new AlexNoMatchService();
