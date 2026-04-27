import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, user_id, role, signal_type, signal_value } = await req.json();

    if (action === "record_signal") {
      // Record a new signal
      const weight = getSignalWeight(signal_type, role);
      
      await supabase.from("nexus_signals").insert({
        user_id,
        signal_type,
        value: signal_value,
        weight,
        source: "system",
      });

      // Record event
      const deltaScore = Math.round(signal_value * weight);
      await supabase.from("nexus_events").insert({
        user_id,
        event_type: signal_type,
        delta_score: deltaScore,
        metadata: { value: signal_value, weight },
      });

      // Recalculate score
      return await recalculateScore(supabase, user_id, role);

    } else if (action === "recalculate") {
      return await recalculateScore(supabase, user_id, role);

    } else if (action === "batch_recalculate") {
      // Recalculate all profiles
      const { data: profiles } = await supabase
        .from("nexus_profiles")
        .select("user_id, role")
        .eq("is_active", true);

      let updated = 0;
      for (const p of profiles || []) {
        await recalculateScore(supabase, p.user_id, p.role, true);
        updated++;
      }

      return new Response(JSON.stringify({ updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getSignalWeight(signalType: string, role: string): number {
  const weights: Record<string, Record<string, number>> = {
    contractor: {
      conversion: 3.0,
      review_positive: 2.5,
      review_negative: -2.0,
      response_speed: 1.5,
      profile_complete: 1.0,
      booking_accepted: 2.0,
      booking_refused: -1.5,
      project_completed: 3.0,
      credential_verified: 2.0,
    },
    homeowner: {
      project_created: 1.5,
      review_submitted: 2.0,
      property_data: 1.0,
      document_uploaded: 1.0,
      engagement: 0.5,
      referral: 2.5,
      booking_completed: 2.0,
    },
  };
  return weights[role]?.[signalType] || 1.0;
}

async function recalculateScore(supabase: any, userId: string, role: string, silent = false) {
  // Get last 90 days of signals
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: signals } = await supabase
    .from("nexus_signals")
    .select("signal_type, value, weight, created_at")
    .eq("user_id", userId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (!signals?.length) {
    const score = 0;
    await upsertProfile(supabase, userId, role, score, {});
    if (silent) return;
    return new Response(JSON.stringify({ user_id: userId, score, level: "nouveau" }), {
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  // Group by type and calculate weighted score
  const breakdown: Record<string, number> = {};
  let totalWeightedValue = 0;
  let totalWeight = 0;

  for (const s of signals) {
    const contribution = s.value * s.weight;
    totalWeightedValue += contribution;
    totalWeight += Math.abs(s.weight);
    breakdown[s.signal_type] = (breakdown[s.signal_type] || 0) + contribution;
  }

  // Normalize to 0-100
  const rawScore = totalWeight > 0 ? (totalWeightedValue / totalWeight) * 20 : 0;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Determine level
  const { data: levels } = await supabase
    .from("nexus_levels")
    .select("level_name, min_score")
    .eq("role", role)
    .order("min_score", { ascending: false });

  const level = levels?.find((l: any) => score >= l.min_score)?.level_name || "nouveau";

  await upsertProfile(supabase, userId, role, score, breakdown, level);

  if (silent) return;
  return new Response(JSON.stringify({ user_id: userId, role, score, level, breakdown }), {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}

async function upsertProfile(supabase: any, userId: string, role: string, score: number, breakdown: any, level?: string) {
  await supabase
    .from("nexus_profiles")
    .upsert({
      user_id: userId,
      role,
      global_score: score,
      level: level || "nouveau",
      breakdown_json: breakdown,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,role" });
}
