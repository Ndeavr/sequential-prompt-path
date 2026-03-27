/**
 * AlexRecoveryService — Partial matches, waitlist, admin recovery.
 */

import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export interface RecoveryResult {
  recoveryMode: "expand_radius" | "show_partial_matches" | "offer_waitlist";
  expandedMatches: Array<{
    contractor_id: string;
    display_name: string;
    match_score: number;
    explanation: string;
  }>;
  shouldOfferWaitlist: boolean;
  recoveryCopy: string;
}

export class AlexRecoveryService {
  async triggerRecovery(sessionToken: string): Promise<RecoveryResult> {
    const token = await getAuthToken();
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-no-result-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_token: sessionToken }),
    });
    const data = await resp.json();
    return {
      recoveryMode: data.recovery_mode,
      expandedMatches: data.expanded_matches || [],
      shouldOfferWaitlist: data.should_offer_waitlist,
      recoveryCopy: data.recovery_copy,
    };
  }

  async submitToWaitlist(sessionToken: string, firstName: string, phone: string, email?: string, projectType?: string, city?: string) {
    await (supabase.from("alex_waitlist_queue") as any).insert({
      session_id: sessionToken,
      first_name: firstName,
      phone,
      email: email || null,
      project_type: projectType || null,
      city: city || null,
      status: "pending",
    });
  }

  getRecoveryCopy(mode: string): string {
    const copies: Record<string, string> = {
      expand_radius: "Je regarde un peu plus loin pour vous trouver le bon.",
      show_partial_matches: "J'ai quelques options qui pourraient marcher. On regarde?",
      offer_waitlist: "Je m'en occupe. On vous contacte rapidement avec la meilleure option.",
    };
    return copies[mode] || "Je cherche encore.";
  }
}

export const alexRecoveryService = new AlexRecoveryService();
