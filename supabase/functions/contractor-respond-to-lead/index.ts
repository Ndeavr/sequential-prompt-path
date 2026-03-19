import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchRow {
  id: string;
  lead_id: string;
  contractor_id: string | null;
  rank_position: number | null;
  status: string;
  response_status: string | null;
}

function findNextMatch(matches: MatchRow[], declinedMatchId: string): MatchRow | null {
  const ordered = [...matches].sort(
    (a, b) => (a.rank_position ?? 999) - (b.rank_position ?? 999)
  );
  const declined = ordered.find((m) => m.id === declinedMatchId);
  if (!declined) return null;
  return (
    ordered.find(
      (m) =>
        (m.rank_position ?? 999) > (declined.rank_position ?? 999) &&
        m.response_status !== "declined" &&
        m.response_status !== "accepted"
    ) ?? null
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const matchId = body?.matchId as string | undefined;
    const decision = body?.decision as "accepted" | "declined" | undefined;
    const declineReason = body?.declineReason as string | undefined;
    const declineCode = body?.declineCode as string | undefined;
    const notes = body?.notes as string | undefined;

    if (!matchId || !decision || !["accepted", "declined"].includes(decision)) {
      return new Response(
        JSON.stringify({ ok: false, error: "matchId and decision (accepted|declined) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify contractor ownership
    const { data: contractor } = await svc
      .from("contractors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!contractor) {
      return new Response(
        JSON.stringify({ ok: false, error: "Contractor profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load the match
    const { data: match } = await svc
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .eq("match_type", "contractor")
      .single();

    if (!match) {
      return new Response(
        JSON.stringify({ ok: false, error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (match.contractor_id !== contractor.id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    // Record the decision
    await svc.from("match_decisions").insert({
      match_id: match.id,
      lead_id: match.lead_id,
      contractor_id: contractor.id,
      decision,
      decline_reason: decision === "declined" ? (declineReason ?? null) : null,
      decline_code: decision === "declined" ? (declineCode ?? null) : null,
      notes: notes ?? null,
    });

    if (decision === "accepted") {
      // Update match
      await svc
        .from("matches")
        .update({ response_status: "accepted", responded_at: now, status: "primary" })
        .eq("id", matchId);

      // Update lead
      await svc
        .from("leads")
        .update({
          status: "contacted",
          matching_status: "accepted",
          assigned_match_id: match.id,
          assigned_contractor_id: contractor.id,
          last_matched_at: now,
        })
        .eq("id", match.lead_id);

      return new Response(
        JSON.stringify({ ok: true, decision: "accepted", leadId: match.lead_id, matchId: match.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === DECLINED ===
    await svc
      .from("matches")
      .update({ response_status: "declined", responded_at: now })
      .eq("id", matchId);

    // Load all matches for escalation
    const { data: allMatches } = await svc
      .from("matches")
      .select("id, lead_id, contractor_id, rank_position, status, response_status")
      .eq("lead_id", match.lead_id)
      .eq("match_type", "contractor")
      .order("rank_position", { ascending: true });

    const nextMatch = findNextMatch((allMatches ?? []) as MatchRow[], match.id);

    if (!nextMatch) {
      // No more matches — needs_review
      await svc
        .from("leads")
        .update({
          matching_status: "needs_review",
          assigned_match_id: null,
          assigned_contractor_id: null,
        })
        .eq("id", match.lead_id);

      return new Response(
        JSON.stringify({ ok: true, decision: "declined", escalated: false, leadId: match.lead_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Promote next match
    await svc
      .from("matches")
      .update({ status: "primary", response_status: "pending" })
      .eq("id", nextMatch.id);

    // Demote others
    await svc
      .from("matches")
      .update({ status: "backup" })
      .eq("lead_id", match.lead_id)
      .neq("id", nextMatch.id)
      .neq("response_status", "declined");

    // Update lead
    await svc
      .from("leads")
      .update({
        matching_status: "escalated",
        assigned_match_id: nextMatch.id,
        assigned_contractor_id: nextMatch.contractor_id,
        last_matched_at: now,
      })
      .eq("id", match.lead_id);

    return new Response(
      JSON.stringify({
        ok: true,
        decision: "declined",
        escalated: true,
        nextMatchId: nextMatch.id,
        leadId: match.lead_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
