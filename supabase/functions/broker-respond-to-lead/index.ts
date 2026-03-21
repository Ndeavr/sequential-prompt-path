/**
 * UNPRO — Broker Respond to Lead
 * Accept or decline a broker match, with escalation logic.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchRow {
  id: string;
  lead_id: string;
  broker_id: string | null;
  rank_position: number | null;
  status: string;
  response_status: string | null;
}

function findNextMatch(matches: MatchRow[], declinedId: string): MatchRow | null {
  const ordered = [...matches].sort((a, b) => (a.rank_position ?? 999) - (b.rank_position ?? 999));
  const declined = ordered.find((m) => m.id === declinedId);
  if (!declined) return null;
  return ordered.find(
    (m) =>
      (m.rank_position ?? 999) > (declined.rank_position ?? 999) &&
      m.response_status !== "declined" &&
      m.response_status !== "accepted"
  ) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const matchId = body?.matchId as string | undefined;
    const decision = body?.decision as "accepted" | "declined" | undefined;
    const declineReason = body?.declineReason as string | undefined;

    if (!matchId || !decision || !["accepted", "declined"].includes(decision)) {
      return new Response(JSON.stringify({ ok: false, error: "matchId and decision required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify broker ownership
    const { data: broker } = await svc
      .from("broker_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!broker) {
      return new Response(JSON.stringify({ ok: false, error: "Broker profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: match } = await svc
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .eq("match_type", "broker")
      .single();

    if (!match) {
      return new Response(JSON.stringify({ ok: false, error: "Match not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (match.broker_id !== broker.id) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Record decision
    await svc.from("match_decisions").insert({
      match_id: match.id,
      lead_id: match.lead_id,
      contractor_id: broker.id, // reusing contractor_id field for broker
      decision,
      decline_reason: decision === "declined" ? (declineReason ?? null) : null,
    });

    if (decision === "accepted") {
      await svc.from("matches").update({
        response_status: "accepted", responded_at: now, status: "primary",
      }).eq("id", matchId);

      await svc.from("leads").update({
        status: "contacted",
        matching_status: "accepted",
        assigned_match_id: match.id,
        last_matched_at: now,
      }).eq("id", match.lead_id);

      return new Response(JSON.stringify({
        ok: true, decision: "accepted", leadId: match.lead_id, matchId: match.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DECLINED — escalation
    await svc.from("matches").update({
      response_status: "declined", responded_at: now,
    }).eq("id", matchId);

    const { data: allMatches } = await svc
      .from("matches")
      .select("id, lead_id, broker_id, rank_position, status, response_status")
      .eq("lead_id", match.lead_id)
      .eq("match_type", "broker")
      .order("rank_position", { ascending: true });

    const nextMatch = findNextMatch((allMatches ?? []) as MatchRow[], match.id);

    if (!nextMatch) {
      await svc.from("leads").update({
        matching_status: "needs_review",
        assigned_match_id: null,
      }).eq("id", match.lead_id);

      return new Response(JSON.stringify({
        ok: true, decision: "declined", escalated: false, leadId: match.lead_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await svc.from("matches").update({ status: "primary", response_status: "pending" }).eq("id", nextMatch.id);
    await svc.from("matches").update({ status: "backup" })
      .eq("lead_id", match.lead_id).neq("id", nextMatch.id).neq("response_status", "declined");

    await svc.from("leads").update({
      matching_status: "escalated",
      assigned_match_id: nextMatch.id,
      last_matched_at: now,
    }).eq("id", match.lead_id);

    return new Response(JSON.stringify({
      ok: true, decision: "declined", escalated: true, nextMatchId: nextMatch.id, leadId: match.lead_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false, error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
