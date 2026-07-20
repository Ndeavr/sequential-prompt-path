// Onboarding Orchestrator — advances every contractor toward LIVE.
// Cron: */10 * * * *
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type State =
  | "SCRAPED" | "VALIDATING" | "CONTACTABLE" | "NEEDS_REVIEW"
  | "INVITED" | "LANDED" | "REGISTERING" | "OTP_VERIFIED"
  | "PAYMENT_COMPLETE" | "ACTIVATED" | "PROFILE_ENRICHMENT"
  | "VERIFIED" | "RECOMMENDATION_ELIGIBLE" | "LIVE" | "STUCK";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function transition(
  contractorId: string,
  from: State,
  to: State,
  actor = "system",
  metadata: Record<string, unknown> = {},
  error?: string,
) {
  const patch: Record<string, unknown> = {
    previous_state: from,
    state: to,
    blocked_reason: to === "STUCK" ? (error ?? "unknown") : null,
    stuck_since: to === "STUCK" ? new Date().toISOString() : null,
    next_action_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
  if (to === "ACTIVATED") patch.activated_at = new Date().toISOString();
  if (to === "LIVE") patch.live_at = new Date().toISOString();

  await supabase.from("contractor_onboarding_states")
    .update(patch)
    .eq("contractor_id", contractorId);

  await supabase.from("contractor_onboarding_events").insert({
    contractor_id: contractorId,
    from_state: from,
    to_state: to,
    actor,
    metadata,
    error: error ?? null,
  });
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function isValidEmail(e: string | null | undefined): boolean {
  return !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** SCRAPED → VALIDATING → CONTACTABLE/NEEDS_REVIEW */
async function handleScraped(row: any) {
  const contractorId = row.contractor_id;
  await transition(contractorId, "SCRAPED", "VALIDATING");

  const { data: lead } = await supabase
    .from("contractor_leads")
    .select("id, business_name, phone, email, city, category, neq, rbq")
    .eq("id", contractorId)
    .maybeSingle();

  if (!lead) {
    await transition(contractorId, "VALIDATING", "STUCK", "system", {}, "lead_missing");
    return;
  }

  const phoneE164 = normalizePhone(lead.phone);
  const emailOk = isValidEmail(lead.email);
  const name = (lead.business_name ?? "").trim();

  // dedupe on phone/neq
  let duplicate = false;
  if (phoneE164) {
    const { count } = await supabase.from("contractor_leads")
      .select("id", { count: "exact", head: true })
      .eq("phone", phoneE164)
      .neq("id", contractorId);
    duplicate = (count ?? 0) > 0;
  }
  if (!duplicate && lead.neq) {
    const { count } = await supabase.from("contractor_leads")
      .select("id", { count: "exact", head: true })
      .eq("neq", lead.neq)
      .neq("id", contractorId);
    duplicate = (count ?? 0) > 0;
  }

  let confidence = 40;
  if (name) confidence += 15;
  if (phoneE164) confidence += 20;
  if (emailOk) confidence += 10;
  if (lead.city) confidence += 5;
  if (lead.rbq) confidence += 5;
  if (lead.neq) confidence += 5;
  if (duplicate) confidence -= 40;
  confidence = Math.max(0, Math.min(100, confidence));

  await supabase.from("contractor_onboarding_states")
    .update({ confidence_score: confidence, metadata: { duplicate, phoneE164, emailOk } })
    .eq("contractor_id", contractorId);

  // queue RBQ/NEQ verify (best-effort)
  try {
    await supabase.functions.invoke("verification-status-refresh", {
      body: { contractor_id: contractorId },
    });
  } catch {}

  const contactable = !duplicate && (phoneE164 || emailOk) && name;
  await transition(
    contractorId,
    "VALIDATING",
    contactable ? "CONTACTABLE" : "NEEDS_REVIEW",
    "system",
    { confidence, duplicate },
  );
}

/** CONTACTABLE → INVITED */
async function handleContactable(row: any) {
  const contractorId = row.contractor_id;
  try {
    const { data: lead } = await supabase.from("contractor_leads")
      .select("id, business_name, phone, email")
      .eq("id", contractorId).maybeSingle();
    if (!lead) throw new Error("lead_missing");

    let smsId: string | null = null;
    let emailId: string | null = null;

    if (lead.phone) {
      try {
        const r = await supabase.functions.invoke("send-outreach-sms", {
          body: { contractor_id: contractorId, phone: lead.phone },
        });
        smsId = (r.data as any)?.message_id ?? null;
      } catch (e) { /* retry next tick */ }
    }
    if (lead.email) {
      try {
        const r = await supabase.functions.invoke("send-outreach-email", {
          body: { contractor_id: contractorId, email: lead.email },
        });
        emailId = (r.data as any)?.message_id ?? null;
      } catch (e) { /* retry next tick */ }
    }

    if (!smsId && !emailId) {
      // retry via retry_count; escalate STUCK after 3
      const retry = (row.retry_count ?? 0) + 1;
      await supabase.from("contractor_onboarding_states")
        .update({ retry_count: retry, next_action_at: new Date(Date.now() + 30 * 60_000).toISOString() })
        .eq("contractor_id", contractorId);
      if (retry >= 3) await transition(contractorId, "CONTACTABLE", "STUCK", "system", { retry }, "invite_delivery_failed");
      return;
    }

    await transition(contractorId, "CONTACTABLE", "INVITED", "system", { smsId, emailId });
  } catch (e) {
    await transition(contractorId, "CONTACTABLE", "STUCK", "system", {}, (e as Error).message);
  }
}

/** ACTIVATED → PROFILE_ENRICHMENT → VERIFIED */
async function handleActivated(row: any) {
  const contractorId = row.contractor_id;
  await transition(contractorId, "ACTIVATED", "PROFILE_ENRICHMENT");
  try {
    await supabase.functions.invoke("enrich-business-profile", {
      body: { contractor_id: contractorId },
    });
  } catch {}
  try {
    await supabase.functions.invoke("verification-status-refresh", {
      body: { contractor_id: contractorId, force: true },
    });
  } catch {}
  await transition(contractorId, "PROFILE_ENRICHMENT", "VERIFIED");
}

/** VERIFIED → RECOMMENDATION_ELIGIBLE / LIVE */
async function handleVerified(row: any) {
  const contractorId = row.contractor_id;

  // readiness signals
  const { data: lead } = await supabase.from("contractor_leads")
    .select("business_name, phone, email, city, category, rbq, neq, website")
    .eq("id", contractorId).maybeSingle();

  let coverage = 0;
  const fields = ["business_name","phone","email","city","category","rbq","neq","website"];
  if (lead) for (const f of fields) if ((lead as any)[f]) coverage += 100 / fields.length;

  const readiness = Math.round(coverage);
  await supabase.from("contractor_onboarding_states")
    .update({ readiness_score: readiness })
    .eq("contractor_id", contractorId);

  if (readiness >= 80) {
    await transition(contractorId, "VERIFIED", "RECOMMENDATION_ELIGIBLE", "system", { readiness });
    await transition(contractorId, "RECOMMENDATION_ELIGIBLE", "LIVE", "system", { readiness });
  } else {
    await transition(contractorId, "VERIFIED", "RECOMMENDATION_ELIGIBLE", "system", { readiness, note: "gaps_open" });
  }
}

async function processBatch() {
  const { data: rows } = await supabase
    .from("contractor_onboarding_states")
    .select("*")
    .in("state", ["SCRAPED", "CONTACTABLE", "ACTIVATED", "VERIFIED"])
    .lte("next_action_at", new Date().toISOString())
    .order("next_action_at", { ascending: true, nullsFirst: true })
    .limit(50);

  if (!rows?.length) return { processed: 0 };

  for (const row of rows) {
    try {
      switch (row.state as State) {
        case "SCRAPED": await handleScraped(row); break;
        case "CONTACTABLE": await handleContactable(row); break;
        case "ACTIVATED": await handleActivated(row); break;
        case "VERIFIED": await handleVerified(row); break;
      }
    } catch (e) {
      await supabase.from("contractor_onboarding_events").insert({
        contractor_id: row.contractor_id,
        from_state: row.state,
        to_state: row.state,
        actor: "system",
        error: (e as Error).message,
      });
    }
  }
  return { processed: rows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const result = await processBatch();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
