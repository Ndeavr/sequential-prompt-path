/**
 * AlexNoMatchService — handles no-match detection, waitlist, retry, and admin stats.
 */
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
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
    return resp.json();
  }

  async createWaitlist(data: WaitlistRequest): Promise<{ waitlist_id: string }> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-no-match-handle`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "waitlist-create", ...data }),
    });
    return resp.json();
  }

  async getStats(): Promise<NoMatchStats> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-no-match-handle`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "stats" }),
    });
    return resp.json();
  }

  getNoMatchCopy(reason: string): string {
    const copies: Record<string, string> = {
      no_available_contractor: "Aucun professionnel disponible pour le moment dans votre secteur.",
      zone_not_covered: "Cette zone n'est pas encore couverte par notre réseau.",
      cluster_saturated: "Nos professionnels dans ce secteur sont actuellement tous occupés.",
      specialty_unavailable: "Cette spécialité n'est pas encore disponible dans votre région.",
    };
    return copies[reason] || "Aucun professionnel trouvé pour le moment.";
  }

  getAlexVoiceResponse(service: string, city: string): string {
    return `Malheureusement, je n'ai pas encore trouvé de professionnel en ${service} disponible à ${city} en ce moment. Je peux continuer à chercher pour vous et vous prévenir dès qu'un bon match apparaît. Ça vous va?`;
  }
}

export const alexNoMatchService = new AlexNoMatchService();
