// PROTECTED FILE — Auto-flag prospects with marketing badges to "Badges 2026" sequence
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRIORITY_BOOST = 25;
const SEQUENCE_NAME = "Badges 2026 - AI Domination";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 200, 500);
    const dryRun = Boolean(body.dry_run);

    // 1. Detect candidates
    const { data: candidates, error: detectErr } = await supabase.rpc(
      "detect_badge_priority_targets",
      { p_limit: limit },
    );
    if (detectErr) throw detectErr;

    const list = candidates ?? [];

    // 2. Resolve "Badges 2026" sequence id
    const { data: seq } = await supabase
      .from("outbound_sequences")
      .select("id")
      .eq("sequence_name", SEQUENCE_NAME)
      .maybeSingle();
    const sequenceId = seq?.id ?? null;

    const summary = {
      scanned: list.length,
      flagged: 0,
      skipped: 0,
      sequence_routed: sequenceId,
      sample: [] as Array<{ id: string; name: string; badges: string[] }>,
    };

    if (dryRun) {
      summary.sample = list.slice(0, 10).map((r: any) => ({
        id: r.target_id,
        name: r.business_name,
        badges: r.badge_matches ?? [],
      }));
      return new Response(JSON.stringify({ ok: true, dry_run: true, summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Flag each target + log audit row
    const now = new Date().toISOString();
    for (const row of list) {
      const badges: string[] = row.badge_matches ?? [];
      if (!badges.length) {
        summary.skipped++;
        continue;
      }

      const reason = `Badges marketing détectés (${badges.length}): ${badges.join(", ")}. L'IA recommande désormais l'audit AI plutôt que les badges.`;

      const { data: current } = await supabase
        .from("sniper_targets")
        .select("sniper_priority_score, tags")
        .eq("id", row.target_id)
        .maybeSingle();

      const newScore = Math.min(
        100,
        Number(current?.sniper_priority_score ?? 0) + PRIORITY_BOOST,
      );
      const tags = Array.isArray(current?.tags) ? current!.tags : [];
      const nextTags = Array.from(new Set([...tags, "badge-2026", "priority-flag"]));

      const { error: updErr } = await supabase
        .from("sniper_targets")
        .update({
          badge_signals: badges,
          priority_flag: "badges_2026",
          auto_flagged_at: now,
          auto_flag_reason: reason,
          sniper_priority_score: newScore,
          tags: nextTags,
        })
        .eq("id", row.target_id);

      if (updErr) {
        summary.skipped++;
        continue;
      }

      await supabase.from("outbound_priority_flags").insert({
        target_id: row.target_id,
        flag_type: "badges_2026",
        severity: badges.length >= 2 ? "critical" : "high",
        badge_signals: badges,
        ai_incoherence_signals: row.ai_incoherence ? [{ score: row.ai_incoherence }] : [],
        priority_score_boost: PRIORITY_BOOST,
        routed_sequence_id: sequenceId,
        source: "auto",
        reason,
      });

      summary.flagged++;
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[sniper-auto-flag-badges]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
