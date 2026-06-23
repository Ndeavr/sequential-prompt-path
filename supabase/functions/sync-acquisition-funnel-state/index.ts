// Rebuild acquisition_funnel_state from raw operational logs.
// Idempotent — upserts on contractor_id. Safe to call from cron, scrapers,
// outreach hooks, or Stripe webhooks.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StageKey =
  | "scraped" | "contacted" | "delivered" | "opened" | "clicked"
  | "registered" | "onboarded" | "paid" | "active";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = new Date().toISOString();
  let upserted = 0;
  const errors: string[] = [];

  try {
    // ── 1. Build outreach map keyed by contractor_id ──────
    const outreachByContractor: Record<string, {
      contacted_at?: string; delivered_at?: string;
      opened_at?: string; clicked_at?: string;
    }> = {};

    const { data: outreach } = await supabase
      .from("contractor_outreach_logs")
      .select("contractor_id, status, sent_at, opened_at, clicked_at, created_at")
      .not("contractor_id", "is", null)
      .limit(10000);

    for (const o of outreach ?? []) {
      const cid = (o as any).contractor_id as string;
      if (!cid) continue;
      const slot = outreachByContractor[cid] ?? (outreachByContractor[cid] = {});
      const status = (o as any).status as string | null;
      const sentAt = (o as any).sent_at ?? (o as any).created_at;
      if (sentAt && (["sent","queued","contacted","sms_sent","email_sent"].includes(status ?? "") || !slot.contacted_at)) {
        if (!slot.contacted_at || sentAt < slot.contacted_at) slot.contacted_at = sentAt;
      }
      if (["delivered","sms_delivered","email_delivered"].includes(status ?? "")) {
        const at = sentAt ?? (o as any).created_at;
        if (at && (!slot.delivered_at || at < slot.delivered_at)) slot.delivered_at = at;
      }
      const oa = (o as any).opened_at;
      if (oa && (!slot.opened_at || oa < slot.opened_at)) slot.opened_at = oa;
      const ca = (o as any).clicked_at;
      if (ca && (!slot.clicked_at || ca < slot.clicked_at)) slot.clicked_at = ca;
    }

    // ── 2. Paid contractors from subscriptions ────────────
    const paidContractors = new Set<string>();
    const paidAt: Record<string, string> = {};
    const { data: subs } = await supabase
      .from("contractor_subscriptions")
      .select("contractor_id, status, created_at")
      .in("status", ["active", "trialing"])
      .limit(5000);
    for (const s of subs ?? []) {
      const cid = (s as any).contractor_id as string;
      if (!cid) continue;
      paidContractors.add(cid);
      const at = (s as any).created_at;
      if (at && (!paidAt[cid] || at < paidAt[cid])) paidAt[cid] = at;
    }

    // ── 3. Iterate contractors ────────────────────────────
    const { data: contractors } = await supabase
      .from("contractors")
      .select("id, business_name, city, user_id, onboarding_status, is_published, created_at, published_at")
      .limit(10000);

    const upsertRows: any[] = [];
    for (const c of contractors ?? []) {
      const cid = (c as any).id as string;
      const o = outreachByContractor[cid] ?? {};
      const isPaid = paidContractors.has(cid);
      const isActive = (c as any).is_published === true;
      const isOnboarded = ["completed", "complete", "onboarded"]
        .includes((c as any).onboarding_status ?? "");
      const isRegistered = !!(c as any).user_id;

      let stage: StageKey = "scraped";
      if (isActive) stage = "active";
      else if (isPaid) stage = "paid";
      else if (isOnboarded) stage = "onboarded";
      else if (isRegistered) stage = "registered";
      else if (o.clicked_at) stage = "clicked";
      else if (o.opened_at) stage = "opened";
      else if (o.delivered_at) stage = "delivered";
      else if (o.contacted_at) stage = "contacted";

      upsertRows.push({
        contractor_id: cid,
        business_name: (c as any).business_name,
        city: (c as any).city,
        scraped_at: (c as any).created_at,
        contacted_at: o.contacted_at ?? null,
        delivered_at: o.delivered_at ?? null,
        opened_at: o.opened_at ?? null,
        clicked_at: o.clicked_at ?? null,
        registered_at: isRegistered ? (c as any).created_at : null,
        paid_at: isPaid ? (paidAt[cid] ?? null) : null,
        activated_at: isActive ? ((c as any).published_at ?? null) : null,
        current_stage: stage,
        last_audited_at: startedAt,
      });
    }

    // ── 4. Also fold in contractor_leads that have no contractor row ──
    const knownContractorIds = new Set((contractors ?? []).map((c: any) => c.id));
    const { data: leads } = await supabase
      .from("contractor_leads")
      .select("id, contractor_id, company_name, city, created_at")
      .limit(10000);

    for (const l of leads ?? []) {
      const cid = (l as any).contractor_id ?? (l as any).id;
      if (knownContractorIds.has(cid)) continue;
      const o = outreachByContractor[cid] ?? {};
      let stage: StageKey = "scraped";
      if (o.clicked_at) stage = "clicked";
      else if (o.opened_at) stage = "opened";
      else if (o.delivered_at) stage = "delivered";
      else if (o.contacted_at) stage = "contacted";
      upsertRows.push({
        contractor_id: cid,
        business_name: (l as any).company_name,
        city: (l as any).city,
        scraped_at: (l as any).created_at,
        contacted_at: o.contacted_at ?? null,
        delivered_at: o.delivered_at ?? null,
        opened_at: o.opened_at ?? null,
        clicked_at: o.clicked_at ?? null,
        current_stage: stage,
        last_audited_at: startedAt,
      });
    }

    // ── 5. Upsert in batches ──────────────────────────────
    const BATCH = 500;
    for (let i = 0; i < upsertRows.length; i += BATCH) {
      const chunk = upsertRows.slice(i, i + BATCH);
      const { error } = await supabase
        .from("acquisition_funnel_state")
        .upsert(chunk, { onConflict: "contractor_id" });
      if (error) errors.push(error.message);
      else upserted += chunk.length;
    }

    return new Response(JSON.stringify({
      ok: true,
      upserted,
      errors,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e), upserted, errors }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
