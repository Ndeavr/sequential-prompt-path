/**
 * Reads the signed-in contractor's own server-confirmed state through
 * existing RLS / SECURITY DEFINER guards. Any read error → "unknown".
 */
import { supabase } from "@/integrations/supabase/client";
import { getMyFreeServiceEntitlement, isActiveFreeServiceEntitlement } from "@/lib/founderEntitlement";
import type { AccountEvidence, PublicationEvidence } from "@/lib/claraContractorWorkspace";

const PUBLICATION = new Set(["unpublished", "published_pending_verification", "verified_active"]);

export async function loadContractorAccountEvidence(): Promise<AccountEvidence> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { signedIn: false, activation: "unknown", publication: "unknown", appointments: null };
  const userId = auth.user.id;

  const [contractorRead, planRead] = await Promise.all([
    supabase.from("contractors").select("id, public_status").eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc("contractor_plan_code", { _user_id: userId }),
  ]);

  let activation: AccountEvidence["activation"] = "unknown";
  if (!planRead.error) {
    if (planRead.data) activation = "confirmed";
    else {
      try {
        activation = isActiveFreeServiceEntitlement(await getMyFreeServiceEntitlement()) ? "free" : "none";
      } catch { activation = "unknown"; }
    }
  }

  if (contractorRead.error) return { signedIn: true, activation, publication: "unknown", appointments: null };
  const contractor = contractorRead.data as { id: string; public_status: string | null } | null;
  if (!contractor) return { signedIn: true, activation, publication: "none", appointments: 0 };

  const publication: PublicationEvidence = contractor.public_status && PUBLICATION.has(contractor.public_status)
    ? (contractor.public_status as PublicationEvidence) : "unknown";
  const { count, error } = await supabase.from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("contractor_id", contractor.id)
    .neq("status", "archived_test");
  return { signedIn: true, activation, publication, appointments: error || count === null ? null : count };
}
