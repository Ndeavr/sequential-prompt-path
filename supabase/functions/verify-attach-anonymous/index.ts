/**
 * UNPRO — Attach an anonymous contractor verification run to a signed-in homeowner.
 *
 * POST /verify-attach-anonymous
 * Auth : Bearer <homeowner JWT> (required)
 * Body : { run_id: string, visitor_id: string }
 *
 * Actions (idempotent) :
 *   1. Load run by id.
 *   2. If run.user_id === auth.uid()  -> already attached, return report_id.
 *   3. Else require run.user_id IS NULL AND run.visitor_id === body.visitor_id.
 *   4. Set user_id = auth.uid(), attached_at = now().
 *   5. Upsert homeowner_profiles(user_id).
 *   6. Insert homeowner_memory_events(source='contractor_verification_completed').
 *   7. Return { report_id, redirect }.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json({ error: "unauthenticated" }, 401);
    const userId = userData.user.id;

    // ── Body ──
    const body = await req.json().catch(() => ({}));
    const runId: string | undefined = body?.run_id;
    const visitorId: string | undefined = body?.visitor_id;
    if (!runId || typeof runId !== "string") return json({ error: "missing_run_id" }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ── Load run ──
    const { data: run, error: runErr } = await admin
      .from("contractor_verification_runs")
      .select("id, user_id, visitor_id, input_business_name, verdict, identity_confidence_score, public_trust_score, visual_trust_score")
      .eq("id", runId)
      .maybeSingle();

    if (runErr) return json({ error: "db_error", detail: runErr.message }, 500);
    if (!run) return json({ error: "not_found" }, 404);

    // Already attached to this user -> idempotent success
    if (run.user_id === userId) {
      return json({
        report_id: run.id,
        redirect: `/proprietaire/verifications/${run.id}`,
        already_attached: true,
      });
    }

    // Belongs to another user -> refuse
    if (run.user_id && run.user_id !== userId) {
      return json({ error: "belongs_to_other_user" }, 403);
    }

    // Anonymous run -> require visitor_id match
    if (!run.visitor_id || run.visitor_id !== visitorId) {
      return json({ error: "visitor_id_mismatch" }, 403);
    }

    // ── Attach ──
    const { error: updErr } = await admin
      .from("contractor_verification_runs")
      .update({
        user_id: userId,
        attached_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .is("user_id", null);

    if (updErr) return json({ error: "attach_failed", detail: updErr.message }, 500);

    // ── Ensure homeowner profile ──
    const { data: existingProfile } = await admin
      .from("homeowner_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await admin.from("homeowner_profiles").insert({ user_id: userId });
    }

    // ── Passport event ──
    await admin.from("homeowner_memory_events").insert({
      user_id: userId,
      source: "contractor_verification_completed",
      question: "contractor_verification",
      answer_raw: run.input_business_name || "verification",
      extracted: {
        report_id: run.id,
        contractor_business_name: run.input_business_name,
        verdict: run.verdict,
        scores: {
          identity_confidence_score: run.identity_confidence_score,
          public_trust_score: run.public_trust_score,
          visual_trust_score: run.visual_trust_score,
        },
      },
      scope: "verification",
      confidence: 1,
    });

    return json({
      report_id: run.id,
      redirect: `/proprietaire/verifications/${run.id}`,
      already_attached: false,
    });
  } catch (e) {
    console.error("verify-attach-anonymous error:", e);
    return json({ error: "internal_error", detail: String(e) }, 500);
  }
});
