/**
 * Reads the signed-in contractor's own server-confirmed state through
 * existing RLS / SECURITY DEFINER guards. Any read error → "unknown".
 *
 * contractor_plan_code() returns a subscription plan code (active, trialing
 * or past_due) OR 'presence' from the signed LIVE CA$350 Stripe branch. A
 * non-empty code alone is never shown as "payment confirmed": the owner's
 * subscription row (RLS: own rows) tells which branch applies.
 */
import { supabase } from "@/integrations/supabase/client";
import { getMyFreeServiceEntitlement, isActiveFreeServiceEntitlement } from "@/lib/founderEntitlement";
import { tallyAppointments, type AccountEvidence, type ActivationEvidence, type PublicationEvidence } from "@/lib/claraContractorWorkspace";

const PUBLICATION = new Set(["unpublished", "published_pending_verification", "verified_active"]);
const SUBSCRIPTION: Record<string, ActivationEvidence> = {
  active: "subscription_active",
  trialing: "subscription_trialing",
  past_due: "subscription_past_due",
};
const APPOINTMENT_READ_LIMIT = 1000;

/** Pure mapping, unit-tested. */
export function activationFrom(plan: { error: boolean; code: string | null }, subscription: { error: boolean; status: string | null }, free: boolean | null): ActivationEvidence {
  if (plan.error) return "unknown";
  if (!plan.code) return free === null ? "unknown" : free ? "free" : "none";
  if (subscription.error) return "plan_active";
  if (subscription.status && SUBSCRIPTION[subscription.status]) return SUBSCRIPTION[subscription.status];
  // No live subscription row: the only remaining branch is the signed LIVE 350 $ entry.
  return plan.code === "presence" ? "entry_paid" : "plan_active";
}

export async function loadContractorAccountEvidence(): Promise<AccountEvidence> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { signedIn: false, activation: "unknown", publication: "unknown", appointments: null };
  const userId = auth.user.id;

  const [contractorRead, planRead] = await Promise.all([
    supabase.from("contractors").select("id, public_status").eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc("contractor_plan_code", { _user_id: userId }),
  ]);
  const contractor = (contractorRead.error ? null : contractorRead.data) as { id: string; public_status: string | null } | null;
  const planCode = typeof planRead.data === "string" && planRead.data ? planRead.data : null;

  let subscription = { error: true, status: null as string | null };
  if (planCode && contractor) {
    const { data, error } = await supabase.from("contractor_subscriptions").select("status")
      .eq("contractor_id", contractor.id).in("status", ["active", "trialing", "past_due"])
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    subscription = { error: Boolean(error), status: (data as { status?: string } | null)?.status ?? null };
  }
  let free: boolean | null = null;
  if (!planRead.error && !planCode) {
    try { free = isActiveFreeServiceEntitlement(await getMyFreeServiceEntitlement()); } catch { free = null; }
  }
  const activation = activationFrom({ error: Boolean(planRead.error), code: planCode }, subscription, free);

  if (contractorRead.error) return { signedIn: true, activation, publication: "unknown", appointments: null };
  if (!contractor) return { signedIn: true, activation, publication: "none", appointments: tallyAppointments([]) };

  const publication: PublicationEvidence = contractor.public_status && PUBLICATION.has(contractor.public_status)
    ? (contractor.public_status as PublicationEvidence) : "unknown";
  const { data: rows, count, error } = await supabase.from("appointments")
    .select("status", { count: "exact" })
    .eq("contractor_id", contractor.id)
    .neq("status", "archived_test")
    .limit(APPOINTMENT_READ_LIMIT);
  if (error || count === null || !rows) return { signedIn: true, activation, publication, appointments: null };
  return { signedIn: true, activation, publication, appointments: tallyAppointments((rows as { status: string | null }[]).map(r => r.status), count) };
}
