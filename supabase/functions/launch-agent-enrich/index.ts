/**
 * launch-agent-enrich — moves DISCOVERED → ENRICHED.
 * Pulls website/email/phone from upstream enrichment tables when present, else skips politely.
 */
import { corsHeaders, adminClient, transitionLead, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";
import { enqueueContactVerification } from "../_shared/autoVerifyContact.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const batch = Math.min(Number(body.batch ?? 20), 50);
  const sb = adminClient();

  const { data: leads, error } = await sb
    .from("launch_leads")
    .select("*")
    .eq("lead_status", "DISCOVERED")
    .order("created_at", { ascending: true })
    .limit(batch);

  if (error) {
    await reportOutcome({ operation: "launch.enrich.run", outcome: "failed", failure_code: FailureCode.SUPABASE_TIMEOUT });
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders });
  }

  let enriched = 0, failed = 0;
  for (const lead of leads ?? []) {
    try {
      // Pull richer data from outbound_companies if external_ref matches
      const { data: company } = await sb
        .from("outbound_companies")
        .select("website_url, email, phone, google_place_id, review_count, rating")
        .eq("id", (lead as any).external_ref)
        .maybeSingle();

      const patch: Record<string, unknown> = {
        payload: {
          ...((lead as any).payload ?? {}),
          enrichment: company ?? {},
          enriched_at: new Date().toISOString(),
        },
      };
      if ((company as any)?.email) patch.email = (company as any).email;
      if ((company as any)?.phone) patch.phone = (company as any).phone;

      await transitionLead((lead as any).id, "ENRICHED", patch, "launch-agent-enrich");

      // 🔒 Auto-enqueue this launch lead for contact verification.
      await enqueueContactVerification({
        business_name: (lead as any).company_name ?? (company as any)?.company_name ?? null,
        email: (company as any)?.email ?? (lead as any).email ?? null,
        phone: (company as any)?.phone ?? (lead as any).phone ?? null,
        website: (company as any)?.website ?? null,
        google_rating: (company as any)?.rating ?? null,
        google_reviews_count: (company as any)?.review_count ?? null,
        city: (lead as any).city ?? null,
        category: (lead as any).category ?? null,
        source_lead_id: (lead as any).id,
        source_table: "launch_leads",
      });

      enriched++;
    } catch (e) {
      failed++;
      await sb.from("launch_leads").update({
        attempts: ((lead as any).attempts ?? 0) + 1,
        failure_code: FailureCode.ENRICHMENT_FAILED,
        last_event_at: new Date().toISOString(),
      }).eq("id", (lead as any).id);
      await logLaunchEvent({
        lead_id: (lead as any).id, agent: "launch-agent-enrich", event: "enrich_failed",
        success: false, message: String(e),
      });
    }
  }

  await reportOutcome({
    operation: "launch.enrich.run",
    outcome: enriched > 0 ? "achieved" : "partial",
    payload: { enriched, failed, attempted: leads?.length ?? 0 },
  });

  return new Response(JSON.stringify({ ok: true, enriched, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
