// get-contractor-operational-status
// Single source of truth for a contractor's operational state across all tables.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OpStatus =
  | "prospect" | "contacted" | "onboarding" | "payment_pending"
  | "active" | "paused" | "suspended" | "expired" | "blocked" | "unknown";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { contractor_id?: string; prospect_id?: string } = {};
  try { body = await req.json(); } catch {}
  const { contractor_id, prospect_id } = body;

  if (!contractor_id && !prospect_id) {
    return json({ error: "contractor_id or prospect_id required" }, 400);
  }

  const blockers: string[] = [];
  const details: Record<string, unknown> = {};

  // Locate contractor
  let contractorId = contractor_id ?? null;
  let onboardingStatus = "not_started";
  let paymentStatus = "none";
  let subscriptionStatus = "none";
  let profileStatus = "absent";
  let verificationStatus = "unverified";
  let matchingStatus = "ineligible";
  let outreachStatus = "none";

  if (prospect_id) {
    const { data: prospect } = await supabase
      .from("contractor_prospects")
      .select("id, phone, email, contractor_id")
      .eq("id", prospect_id)
      .maybeSingle();
    details.prospect = prospect;
    if (prospect?.contractor_id) contractorId = prospect.contractor_id as string;
    if (prospect) {
      outreachStatus = "prospect_created";
      if (prospect.phone || prospect.email) outreachStatus = "contactable";
    }
  }

  if (prospect_id) {
    const { count } = await supabase
      .from("contractor_outreach_logs")
      .select("*", { count: "exact", head: true })
      .eq("prospect_id" as any, prospect_id);
    if ((count ?? 0) > 0) outreachStatus = "sent";
  }

  if (contractorId) {
    const [sub, entit, match, prof] = await Promise.all([
      supabase.from("contractor_subscriptions").select("status, payment_status, current_period_end").eq("contractor_id", contractorId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("contractor_entitlements").select("can_be_matched, can_receive_appointments, public_profile_enabled").eq("contractor_id", contractorId).maybeSingle(),
      supabase.from("contractor_matching_status").select("is_eligible, eligibility_reason, capacity_status").eq("contractor_id", contractorId).maybeSingle(),
      supabase.from("contractor_public_pages").select("is_published").eq("contractor_id", contractorId).maybeSingle(),
    ]);

    details.subscription = sub.data;
    details.entitlements = entit.data;
    details.matching = match.data;
    details.public_page = prof.data;

    subscriptionStatus = (sub.data as any)?.status ?? "none";
    paymentStatus = (sub.data as any)?.payment_status ?? "none";
    profileStatus = (prof.data as any)?.is_published ? "published" : "draft";
    matchingStatus = (match.data as any)?.is_eligible ? "eligible" : "ineligible";
    if (!(entit.data as any)?.can_be_matched) blockers.push("entitlement.can_be_matched=false");
    if (!(match.data as any)?.is_eligible) blockers.push(`matching.is_eligible=false (${(match.data as any)?.eligibility_reason ?? "reason unknown"})`);
    if (!(prof.data as any)?.is_published) blockers.push("public_profile.not_published");
  }

  // Onboarding
  if (contractorId) {
    const { data: onb } = await supabase
      .from("contractor_onboarding_sessions")
      .select("current_step, completed_at, selected_plan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (onb) {
      onboardingStatus = (onb as any).completed_at ? "completed" : `step_${(onb as any).current_step}`;
      details.onboarding = onb;
    }
  }

  // Determine operational status
  let operational: OpStatus = "unknown";
  if (subscriptionStatus === "active" && (details.entitlements as any)?.can_be_matched) operational = "active";
  else if (subscriptionStatus === "active") operational = "paused";
  else if (subscriptionStatus === "canceled" || subscriptionStatus === "expired") operational = "expired";
  else if (paymentStatus === "pending" || onboardingStatus.startsWith("step_")) operational = "payment_pending";
  else if (onboardingStatus !== "not_started" && onboardingStatus !== "completed") operational = "onboarding";
  else if (outreachStatus === "sent") operational = "contacted";
  else if (contractorId || prospect_id) operational = "prospect";

  return json({
    contractor_id: contractorId,
    prospect_id: prospect_id ?? null,
    onboarding_status: onboardingStatus,
    payment_status: paymentStatus,
    subscription_status: subscriptionStatus,
    profile_status: profileStatus,
    verification_status: verificationStatus,
    matching_status: matchingStatus,
    outreach_status: outreachStatus,
    operational_status: operational,
    blockers,
    details,
  });

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
