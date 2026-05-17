// Live acquisition orchestrator — runs steps 1-4 (search, extract, AIPP, page/SMS draft).
// Steps 5-12 are admin-gated (SMS approval, send, click, plan view, checkout, payment, activation).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STEPS = [
  "search",
  "extracted",
  "aipp",
  "page",
  "sms_drafted",
  "sms_approved",
  "sms_sent",
  "link_clicked",
  "plan_viewed",
  "checkout_started",
  "payment_completed",
  "activated",
];

async function logStep(sb: any, runId: string, key: string, status: string, log: any) {
  const order = STEPS.indexOf(key);
  await sb.from("acquisition_run_steps").upsert(
    {
      run_id: runId,
      step_key: key,
      step_order: order,
      status,
      logs: [{ at: new Date().toISOString(), status, ...log }],
      started_at: status === "running" ? new Date().toISOString() : undefined,
      completed_at: ["succeeded", "failed"].includes(status) ? new Date().toISOString() : undefined,
    },
    { onConflict: "run_id,step_key" }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const slug: string = body.slug || "isolation-solution-royal";
    const campaign: string = body.campaign || "isr_first_live_test";

    // Resolve prospect
    const { data: prospect, error: pErr } = await sb
      .from("war_prospects")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (pErr || !prospect) throw new Error(`prospect_not_found:${slug}`);

    // Create or reuse run
    let runId: string;
    const { data: existingRun } = await sb
      .from("live_acquisition_runs")
      .select("id")
      .eq("prospect_id", prospect.id)
      .eq("campaign", campaign)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRun?.id && !body.force_new) {
      runId = existingRun.id;
    } else {
      const { data: run, error: rErr } = await sb
        .from("live_acquisition_runs")
        .insert({
          prospect_id: prospect.id,
          campaign,
          status: "running",
          metadata: { slug, website: prospect.website, phone: prospect.phone },
        })
        .select("id")
        .single();
      if (rErr || !run) throw new Error(`run_create_failed:${rErr?.message}`);
      runId = run.id;
      // Initialize all steps as pending
      const rows = STEPS.map((k, i) => ({
        run_id: runId,
        step_key: k,
        step_order: i,
        status: "pending",
        logs: [],
      }));
      await sb.from("acquisition_run_steps").insert(rows);
    }

    // STEP 1: search (already done — prospect exists)
    await logStep(sb, runId, "search", "succeeded", {
      message: "Prospect resolved from war_prospects",
      slug,
      website: prospect.website,
    });

    // STEP 2: extracted (use existing data; if no website data, mark as ok)
    await logStep(sb, runId, "extracted", "succeeded", {
      company_name: prospect.company_name,
      phone: prospect.phone,
      email: prospect.email,
      city: prospect.city,
      category: prospect.category,
    });

    // STEP 3: AIPP — store scores from prospect (already populated)
    await logStep(sb, runId, "aipp", "succeeded", {
      visibility: prospect.visibility_score,
      trust: prospect.trust_score,
      conversion: prospect.conversion_score,
      speed: prospect.speed_score,
      opportunity: prospect.opportunity_score,
      missed_leads_monthly: prospect.estimated_missed_leads_monthly,
    });

    // STEP 4: page ready
    const origin = req.headers.get("origin") || "https://unpro.ca";
    const landingUrl = `${origin}/pro/${slug}`;
    await logStep(sb, runId, "page", "succeeded", { url: landingUrl });

    // STEP 5: sms_drafted (does NOT send)
    const trackingLink = landingUrl; // short link can be swapped in later
    const smsBody =
      `Bonjour ${prospect.company_name} — UNPRO a préparé votre profil IA local pour l'isolation d'entretoit sur la Rive-Nord. ` +
      `On a détecté des occasions de visibilité sur Google, ChatGPT et les recherches locales. ` +
      `Votre page est prête ici: ${trackingLink}  Activation aujourd'hui: 1$.\n\nStop = répondre STOP.`;

    await sb
      .from("live_acquisition_runs")
      .update({
        metadata: {
          slug,
          website: prospect.website,
          phone: prospect.phone,
          landing_url: landingUrl,
          sms_body: smsBody,
          sms_to: prospect.phone,
        },
      })
      .eq("id", runId);

    await logStep(sb, runId, "sms_drafted", "succeeded", {
      to: prospect.phone,
      body: smsBody,
      awaiting_admin_approval: true,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        prospect_id: prospect.id,
        landing_url: landingUrl,
        sms_preview: smsBody,
        sms_to: prospect.phone,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[run-live-acquisition]", e);
    return new Response(
      JSON.stringify({ error: String((e as any)?.message ?? e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
