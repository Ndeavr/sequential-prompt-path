// Challenge Signup Orchestrator
// Coordonne 4 agents : signup_hunter | email_sequence | signup_conversion | daily_reporter
// Invocation: POST /challenge-signup-orchestrator { agent: "signup_hunter" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RunResult {
  agent: string;
  processed: number;
  details: Record<string, unknown>;
  error?: string;
}

async function runAgent(agentKey: string, sb: ReturnType<typeof createClient>): Promise<RunResult> {
  const result: RunResult = { agent: agentKey, processed: 0, details: {} };

  try {
    if (agentKey === "signup_hunter") {
      // Load blocklist (competitors / directories / social)
      const { data: blocklist } = await sb.from("challenge_domain_blocklist").select("pattern");
      const patterns = ((blocklist ?? []) as Array<{ pattern: string }>).map((b) => String(b.pattern ?? "").toLowerCase());

      const isBlocked = (email: string | null, company: string | null, domain: string | null) => {
        const haystack = `${email ?? ""} ${company ?? ""} ${domain ?? ""}`.toLowerCase();
        return patterns.some((p) => haystack.includes(p));
      };

      // Strict pro-email validation
      const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const FREE_PROVIDERS = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com", "icloud.com", "videotron.ca", "sympatico.ca"];
      const isValidProEmail = (email: string | null) => {
        if (!email) return false;
        const e = email.trim().toLowerCase();
        if (!EMAIL_RE.test(e)) return false;
        if (e.includes("@www.") || e.includes("..")) return false;
        const domain = e.split("@")[1];
        // Allow free providers but require non-generic local part (not info@, contact@, etc on free)
        const local = e.split("@")[0];
        const generics = ["info", "contact", "admin", "noreply", "no-reply", "support", "hello", "bonjour", "service", "ventes", "sales"];
        if (FREE_PROVIDERS.includes(domain) && generics.includes(local)) return false;
        return true;
      };

      const { data: leads } = await sb
        .from("outbound_leads")
        .select("id, company_name, email, specialty, domain, qualification_status, last_contacted_at")
        .not("email", "is", null)
        .is("last_contacted_at", null)
        .neq("qualification_status", "disqualified_competitor")
        .limit(100);

      let added = 0;
      let rejected = 0;
      for (const l of leads || []) {
        if (isBlocked(l.email, l.company_name, l.domain) || !isValidProEmail(l.email)) {
          await sb.from("outbound_leads").update({
            qualification_status: "disqualified_competitor",
            rejection_reason: isBlocked(l.email, l.company_name, l.domain) ? "blocklist_match" : "invalid_pro_email",
            updated_at: new Date().toISOString(),
          }).eq("id", l.id);
          rejected++;
          continue;
        }

        const { count } = await sb
          .from("challenge_signup_events")
          .select("*", { count: "exact", head: true })
          .eq("outbound_lead_id", l.id)
          .eq("event_type", "prospect_qualified");
        if ((count ?? 0) > 0) continue;

        await sb.from("challenge_signup_events").insert({
          event_type: "prospect_qualified",
          agent_source: "signup_hunter",
          outbound_lead_id: l.id,
          funnel_stage: "qualified",
          metadata: { company_name: l.company_name, specialty: l.specialty, email: l.email },
        });
        added++;
        if (added >= 50) break;
      }
      result.processed = added;
      result.details = { qualified_count: added, rejected_count: rejected, blocklist_size: patterns.length, source_pool: leads?.length ?? 0 };
    }

    else if (agentKey === "email_sequence") {
      // Find qualified events without sent email
      const { data: qualified } = await sb
        .from("challenge_signup_events")
        .select("id, outbound_lead_id, metadata, created_at")
        .eq("event_type", "prospect_qualified")
        .order("created_at", { ascending: false })
        .limit(20);

      let queued = 0;
      for (const ev of qualified || []) {
        // Check if email already sent for this lead
        const { count } = await sb
          .from("challenge_signup_events")
          .select("*", { count: "exact", head: true })
          .eq("outbound_lead_id", ev.outbound_lead_id)
          .eq("event_type", "email_sent");
        if ((count ?? 0) > 0) continue;

        // Trigger personalized email via existing send-transactional-email
        try {
          const { data: lead } = await sb
            .from("outbound_leads")
            .select("email, company_name, specialty")
            .eq("id", ev.outbound_lead_id)
            .maybeSingle();
          if (!lead?.email) continue;

          const idempotencyKey = `challenge-email1-${ev.outbound_lead_id}`;
          await sb.functions.invoke("send-transactional-email", {
            body: {
              template: "challenge_aipp_reveal",
              to: lead.email,
              idempotency_key: idempotencyKey,
              data: {
                company_name: lead.company_name,
                specialty: lead.specialty,
                aipp_url: `https://unpro.ca/aipp?lead=${ev.outbound_lead_id}`,
              },
              subject: `${lead.company_name} — Voici votre score AIPP`,
            },
          });

          // Mark contacted
          await sb.from("outbound_leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", ev.outbound_lead_id);

          await sb.from("challenge_signup_events").insert({
            event_type: "email_sent",
            agent_source: "email_sequence",
            outbound_lead_id: ev.outbound_lead_id,
            funnel_stage: "contacted",
            metadata: { email_step: 1, recipient: lead.email, idempotency_key: idempotencyKey },
          });
          queued++;
        } catch (e) {
          await sb.from("challenge_signup_events").insert({
            event_type: "email_failed",
            agent_source: "email_sequence",
            outbound_lead_id: ev.outbound_lead_id,
            metadata: { error: String(e) },
          });
        }
      }
      result.processed = queued;
      result.details = { emails_queued: queued };
    }

    else if (agentKey === "signup_conversion") {
      // Detect aipp_viewed > 2h ago without signup → nudge
      const { data: stale } = await sb
        .from("challenge_signup_events")
        .select("outbound_lead_id, created_at, metadata")
        .eq("event_type", "aipp_viewed")
        .lt("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .limit(20);

      let nudges = 0;
      for (const ev of stale || []) {
        const { count } = await sb
          .from("challenge_signup_events")
          .select("*", { count: "exact", head: true })
          .eq("outbound_lead_id", ev.outbound_lead_id)
          .in("event_type", ["signup_completed", "nudge_sent"]);
        if ((count ?? 0) > 0) continue;

        await sb.from("challenge_signup_events").insert({
          event_type: "nudge_sent",
          agent_source: "signup_conversion",
          outbound_lead_id: ev.outbound_lead_id,
          funnel_stage: "nudged",
          metadata: { reason: "aipp_viewed_no_signup_2h" },
        });
        nudges++;
      }
      result.processed = nudges;
      result.details = { nudges_sent: nudges };
    }

    else if (agentKey === "daily_reporter") {
      // Aggregate funnel for last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await sb
        .from("challenge_signup_events")
        .select("event_type")
        .gte("created_at", since);

      const counts: Record<string, number> = {};
      for (const e of events || []) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;

      const { data: target } = await sb
        .from("challenge_targets")
        .select("*")
        .eq("challenge_key", "first_signup_72h")
        .maybeSingle();

      result.processed = events?.length ?? 0;
      result.details = {
        funnel_24h: counts,
        target: target ? { current: target.current_value, goal: target.target_value, ends_at: target.ends_at } : null,
        alert: (counts["signup_completed"] ?? 0) === 0 ? "ZERO_SIGNUP_24H" : null,
      };
    }

    else {
      throw new Error(`Unknown agent: ${agentKey}`);
    }

    // Update agent state
    await sb.from("challenge_agent_state").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "success",
      last_run_summary: result.details,
      last_error: null,
      total_runs: ((await sb.from("challenge_agent_state").select("total_runs").eq("agent_key", agentKey).maybeSingle()).data?.total_runs ?? 0) + 1,
      total_processed: ((await sb.from("challenge_agent_state").select("total_processed").eq("agent_key", agentKey).maybeSingle()).data?.total_processed ?? 0) + result.processed,
    }).eq("agent_key", agentKey);

  } catch (e) {
    result.error = String(e);
    await sb.from("challenge_agent_state").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "error",
      last_error: String(e),
    }).eq("agent_key", agentKey);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check enabled state
    const agentKey = body.agent as string;
    if (!agentKey) {
      // Run all enabled agents
      const { data: agents } = await sb.from("challenge_agent_state").select("*").eq("enabled", true);
      const results: RunResult[] = [];
      for (const a of agents || []) results.push(await runAgent(a.agent_key, sb));
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: state } = await sb.from("challenge_agent_state").select("enabled").eq("agent_key", agentKey).maybeSingle();
    if (!state?.enabled) {
      return new Response(JSON.stringify({ ok: false, skipped: true, reason: "agent_disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await runAgent(agentKey, sb);
    return new Response(JSON.stringify({ ok: !result.error, result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
