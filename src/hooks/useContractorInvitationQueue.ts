/**
 * UNPRO — File d'invitation entrepreneurs (données réelles uniquement).
 * Lit la fonction serveur `contractor_invitation_queue` : offre calculée,
 * capacité réelle, consentement, attribution et étape du cycle de vie.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InvitationQueueRow = {
  lead_id: string;
  company_name: string | null;
  first_name: string | null;
  city: string | null;
  trade_label: string | null;
  category_slug: string | null;
  phone_e164: string | null;
  email: string | null;
  offer: string | null;
  category_group: string | null;
  city_remaining: number | null;
  offer_reason: string | null;
  contactable: boolean | null;
  block_reason: string | null;
  attribution_type: string | null;
  attributed_user_id: string | null;
  lifecycle_status: string | null;
  last_event_at: string | null;
  onboarding_token: string | null;
};

export function useContractorInvitationQueue(city: string, limit = 100) {
  return useQuery<InvitationQueueRow[]>({
    queryKey: ["contractor-invitation-queue", city, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("contractor_invitation_queue", {
        p_city: city,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as InvitationQueueRow[];
    },
    staleTime: 30_000,
    retry: false,
  });
}

export type PreparedInvite = {
  ok: true;
  lead_id: string;
  company_name: string | null;
  city: string | null;
  category_slug: string;
  offer: "free_founding" | "express_350";
  city_remaining: number | null;
  invite_url: string;
  sent: false;
};

export async function prepareInvitation(leadId: string): Promise<PreparedInvite> {
  const { data, error } = await supabase.functions.invoke("outreach-prepare-invite", {
    body: {
      lead_id: leadId,
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
  if (error) {
    const detail = (data as { error?: string } | null)?.error;
    throw new Error(detail ?? error.message);
  }
  const payload = data as PreparedInvite & { error?: string };
  if (!payload?.ok) throw new Error(payload?.error ?? "prepare_failed");
  return payload;
}
