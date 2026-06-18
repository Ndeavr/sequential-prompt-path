// UNPRO — Critical Path Snapshot
// Computes the 7-stage acquisition funnel with real numbers from production tables.
// GET/POST → returns { stages: [...], captured_at } and writes a snapshot row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Stage = {
  stage: string;
  label: string;
  order: number;
  value: number;
  previous?: number;
  conversion_rate?: number;
  top_failures: Array<{ code: string; count: number }>;
  meta?: Record<string, unknown>;
};

async function safeCount(supabase: any, table: string, build: (q: any) => any): Promise<number> {
  try {
    const q = supabase.from(table).select("id", { count: "exact", head: true });
    const { count, error } = await build(q);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Stage 1 — Prospect Found (7d)
  const scraped = await safeCount(supabase, "contractor_prospects", (q) => q.gte("created_at", since7d));
  const withRbq = await safeCount(supabase, "contractor_prospects", (q) =>
    q.gte("created_at", since7d).not("rbq_number", "is", null)
  );
  const withPhone = await safeCount(supabase, "contractor_prospects", (q) =>
    q.gte("created_at", since7d).not("phone", "is", null)
  );
  const withEmail = await safeCount(supabase, "contractor_prospects", (q) =>
    q.gte("created_at", since7d).not("email", "is", null)
  );

  // Stage 2 — SMS/Email Sent (24h) — read each channel from its canonical source.
  const curiositySmsSent = await safeCount(supabase, "contractor_curiosity_sms_events", (q) =>
    q.eq("status", "sent").gte("sent_at", since24h)
  );
  const smsFailed = await safeCount(supabase, "contractor_curiosity_sms_events", (q) =>
    q.eq("status", "failed").gte("sent_at", since24h)
  );
  const outreachLogsSms = await safeCount(supabase, "contractor_outreach_logs", (q) =>
    q.gte("sent_at", since24h).eq("channel", "sms")
  );
  const outreachLogsEmail = await safeCount(supabase, "contractor_outreach_logs", (q) =>
    q.gte("sent_at", since24h).eq("channel", "email")
  );
  // De-dup: a curiosity SMS may also be mirrored in outreach_logs. Use the max
  // of both sources for SMS and add the email count once.
  const smsSent = Math.max(curiositySmsSent, outreachLogsSms);
  const emailSent = outreachLogsEmail;
  const messagesSent = smsSent + emailSent;

  // Stage 3 — Link Clicked (canonical source: outreach_click_events; pro_landing_views is informational)
  const clickEvents = await safeCount(supabase, "outreach_click_events", (q) =>
    q.gte("clicked_at", since24h)
  );
  const landingViews = await safeCount(supabase, "pro_landing_views", (q) => q.gte("created_at", since24h));

  // Stage 4 — Alex auto-start (only count sessions seeded by the outreach funnel)
  let alexStarted = 0;
  let alexFromOutreach = 0;
  try {
    const { count } = await supabase
      .from("alex_conversation_sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h);
    alexStarted = count ?? 0;
  } catch { /* ignore */ }
  try {
    const { count } = await supabase
      .from("alex_conversation_sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h)
      .in("source", ["outreach", "pro_landing", "curiosity", "sms"]);
    alexFromOutreach = count ?? 0;
  } catch { /* column may not exist — fall back to total */ alexFromOutreach = alexStarted; }

  // Stage 5 — Analysis 100%
  const analysisTotal = await safeCount(supabase, "contractor_aipp_jobs", (q) => q.gte("created_at", since24h));
  const analysisDone = await safeCount(supabase, "contractor_aipp_jobs", (q) =>
    q.gte("created_at", since24h).eq("status", "completed")
  );
  const analysisFailed = await safeCount(supabase, "contractor_aipp_jobs", (q) =>
    q.gte("created_at", since24h).eq("status", "failed")
  );

  // Stage 6 — Payment
  const paid = await safeCount(supabase, "pricing_payment_events", (q) =>
    q.gte("created_at", since24h).eq("status", "succeeded")
  );
  const checkoutStarted = await safeCount(supabase, "pricing_checkout_sessions", (q) =>
    q.gte("created_at", since24h)
  );

  // Stage 7 — Activation / Reward
  const activated = await safeCount(supabase, "contractor_profiles", (q) =>
    q.gte("created_at", since24h).eq("is_active", true)
  );

  // Top failure codes (last 24h)
  let topFailures: Array<{ code: string; count: number }> = [];
  try {
    const { data } = await supabase
      .from("platform_operation_outcomes")
      .select("failure_code")
      .gte("created_at", since24h)
      .not("failure_code", "is", null)
      .limit(500);
    const tally: Record<string, number> = {};
    (data || []).forEach((r: any) => { tally[r.failure_code] = (tally[r.failure_code] || 0) + 1; });
    topFailures = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));
  } catch { /* ignore */ }

  const qualityAlert =
    scraped > 0 &&
    ((withEmail / scraped < 0.3) || (withRbq / scraped < 0.3));

  const stages: Stage[] = [
    {
      stage: "prospect_found", label: "1. Prospect Trouvé", order: 1,
      value: scraped, top_failures: [],
      meta: { with_rbq: withRbq, with_phone: withPhone, with_email: withEmail, window: "7d", quality_alert: qualityAlert },
    },
    {
      stage: "messages_sent", label: "2. SMS / Email Envoyés", order: 2,
      value: messagesSent, top_failures: [],
      meta: { sms_sent: smsSent, sms_failed: smsFailed, email_sent: emailSent, window: "24h" },
    },
    {
      stage: "link_clicked", label: "3. Lien Cliqué", order: 3,
      value: clickEvents, top_failures: [],
      meta: { clicks: clickEvents, landing_views: landingViews, window: "24h" },
    },
    {
      stage: "alex_started", label: "4. Alex Démarre", order: 4,
      value: alexFromOutreach, top_failures: [],
      meta: { from_outreach: alexFromOutreach, total_sessions: alexStarted, window: "24h" },
    },
    {
      stage: "analysis_complete", label: "5. Analyse 100%", order: 5,
      value: analysisDone, top_failures: [],
      meta: { total: analysisTotal, completed: analysisDone, failed: analysisFailed, window: "24h" },
    },
    {
      stage: "payment_ok", label: "6. Paiement Réussi", order: 6,
      value: paid, top_failures: [],
      meta: { checkout_started: checkoutStarted, paid, window: "24h" },
    },
    {
      stage: "reward_visible", label: "7. Récompense Immédiate", order: 7,
      value: activated, top_failures: topFailures,
      meta: { activated, window: "24h" },
    },
  ];

  // Compute conversion rates between consecutive stages
  for (let i = 0; i < stages.length; i++) {
    if (i > 0) {
      const prev = stages[i - 1].value;
      stages[i].previous = prev;
      stages[i].conversion_rate = prev > 0 ? Math.round((stages[i].value / prev) * 100) : 0;
    }
  }

  // Persist snapshot (best-effort)
  try {
    const captured_at = new Date().toISOString();
    await supabase.from("critical_path_metrics_snapshot").insert(
      stages.map((s) => ({
        captured_at,
        stage: s.stage,
        stage_order: s.order,
        value: s.value,
        previous_stage_value: s.previous ?? null,
        conversion_rate: s.conversion_rate ?? null,
        top_failures: s.top_failures,
        meta: s.meta ?? {},
      }))
    );
  } catch { /* ignore */ }

  return new Response(
    JSON.stringify({ captured_at: new Date().toISOString(), stages }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
