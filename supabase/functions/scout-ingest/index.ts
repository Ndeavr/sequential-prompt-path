/**
 * scout-ingest — the single authenticated ingestion endpoint for UNPRO Scout.
 *
 * Scout is a DISCOVERY SOURCE ONLY. It never sends outreach and never marks a
 * prospect as verified or SMS-eligible: every capture lands in the existing
 * acquisition table (`verified_contractor_prospects`) with
 *   source = 'facebook_group', verification_status = 'needs_enrichment',
 *   phone_validation_status = 'unverified', sms_eligible = false
 * so the canonical verification / CASL / Twilio / dedupe gates stay in charge.
 *
 * Actions:
 *   start_session { group_name?, group_url? }         -> { session_id }
 *   capture       { session_id, ...capture payload }  -> { status, prospect_id }
 *   end_session   { session_id }                      -> { ok, stats }
 *   session_stats { session_id }                      -> { stats }
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { parseScoutText, toE164, normalizeDomain, normalizeEmail, hasContactPoint } from "../_shared/scoutParser.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Quality score mirrors the acquisition scoring bands; stays < 80 until enriched. */
function qualityScore(s: { phone_e164: string | null; email: string | null; website_url: string | null; company_name: string | null; city: string | null; category: string | null }) {
  return Math.min(
    79,
    (s.phone_e164 ? 25 : 0) + (s.email ? 20 : 0) + (s.website_url ? 15 : 0) +
      (s.company_name ? 10 : 0) + (s.city ? 5 : 0) + (s.category ? 4 : 0),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    /* ── 1. Authentication: a real UNPRO admin session is mandatory ── */
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized", message: "Missing bearer token" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json({ error: "unauthorized", message: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden", message: "Admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "capture");

    /* ── 2. Session lifecycle ── */
    if (action === "start_session") {
      const { data, error } = await admin
        .from("scout_sessions")
        .insert({
          user_id: user.id,
          group_name: body.group_name ?? null,
          group_url: body.group_url ?? null,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw error;
      return json({ session_id: data.id });
    }

    if (action === "end_session") {
      const { data, error } = await admin
        .from("scout_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", body.session_id)
        .eq("user_id", user.id)
        .select("captured_count,new_count,duplicate_count,error_count")
        .maybeSingle();
      if (error) throw error;
      return json({ ok: true, stats: data ?? null });
    }

    if (action === "session_stats") {
      const { data, error } = await admin
        .from("scout_sessions")
        .select("captured_count,new_count,duplicate_count,error_count,status")
        .eq("id", body.session_id)
        .maybeSingle();
      if (error) throw error;
      return json({ stats: data });
    }

    if (action !== "capture") return json({ error: "unknown_action", action }, 400);

    /* ── 3. Extraction ── */
    const sessionId: string | null = body.session_id ?? null;
    let mode: "dom" | "image" | "manual" = ["dom", "image", "manual"].includes(body.extraction_mode)
      ? body.extraction_mode
      : "dom";
    let rawText: string = String(body.raw_text ?? "");
    let signals = parseScoutText(rawText, body.author_name);
    let visionRaw: Record<string, unknown> | null = null;

    if (body.image_data_url) {
      mode = "image";
      // Reuse the existing production vision function — no second AI path.
      const vres = await admin.functions.invoke("extract-business-card", {
        body: { image_data_url: body.image_data_url, mime_type: body.mime_type },
      });
      if (vres.error) {
        // Record the failure instead of silently dropping the capture.
        await admin.from("scout_captures").insert({
          session_id: sessionId, user_id: user.id, source_url: body.source_url ?? null,
          post_url: body.post_url ?? null, group_name: body.group_name ?? null,
          author_name: body.author_name ?? null, raw_text: rawText, extraction_mode: "image",
          dedupe_status: "error", error: `vision_failed: ${vres.error.message ?? "unknown"}`,
        });
        await bumpSession(admin, sessionId, { captured: 1, error: 1 });
        return json({ status: "error", reason: "vision_failed" }, 200);
      }
      visionRaw = (vres.data as Record<string, unknown>) ?? {};
      const v = visionRaw as Record<string, any>;
      const merged = parseScoutText(
        [rawText, v.company_name, v.phone, v.mobile_phone, v.email, v.website_url, v.city].filter(Boolean).join("\n"),
        body.author_name ?? ([v.contact_first_name, v.contact_last_name].filter(Boolean).join(" ") || null),
      );
      signals = {
        ...merged,
        company_name: v.company_name ?? merged.company_name,
        contact_name:
          [v.contact_first_name, v.contact_last_name].filter(Boolean).join(" ") || merged.contact_name,
        phone_e164: toE164(v.mobile_phone ?? v.phone) ?? merged.phone_e164,
        email: normalizeEmail(v.email) ?? merged.email,
        website_url: v.website_url ?? merged.website_url,
        city: v.city ?? merged.city,
        // intent never comes from a card image — keep the post text signal only
        intent_score: merged.intent_score,
        intent_evidence: merged.intent_evidence,
      };
      rawText = rawText || JSON.stringify(v);
    }

    // Manual overrides from the popup form (explicit human input wins).
    const ov = body.overrides ?? {};
    if (ov.company_name) signals.company_name = String(ov.company_name);
    if (ov.phone) signals.phone_e164 = toE164(ov.phone) ?? signals.phone_e164;
    if (ov.email) signals.email = normalizeEmail(ov.email) ?? signals.email;
    if (ov.website_url) signals.website_url = String(ov.website_url);
    if (ov.city) signals.city = String(ov.city);
    if (ov.category) signals.category = String(ov.category);

    const captureRow: Record<string, unknown> = {
      session_id: sessionId,
      user_id: user.id,
      source_platform: "facebook_group",
      source_url: body.source_url ?? null,
      post_url: body.post_url ?? null,
      group_name: body.group_name ?? null,
      author_name: body.author_name ?? null,
      raw_text: rawText.slice(0, 8000),
      extraction_mode: mode,
      company_name: signals.company_name,
      contact_name: signals.contact_name,
      phone_e164: signals.phone_e164,
      email: signals.email,
      website_url: signals.website_url,
      rbq_number: signals.rbq_number,
      city: signals.city,
      category: signals.category,
      extracted: { ...signals, vision: visionRaw },
      confidence: signals.confidence,
      intent_score: signals.intent_score,
      intent_evidence: signals.intent_evidence,
      captured_at: body.captured_at ?? new Date().toISOString(),
    };

    if (!hasContactPoint(signals)) {
      // Not an error — chit-chat with no contact point is the common case in a
      // group feed. Recorded as 'skipped' so the operator stats stay honest.
      await admin.from("scout_captures").insert({ ...captureRow, dedupe_status: "skipped", error: "no_contact_point" });
      await bumpSession(admin, sessionId, { captured: 1 });
      return json({ status: "skipped", reason: "no_contact_point" });
    }

    /* ── 4. Dedupe against the existing acquisition universe ── */
    const domain = normalizeDomain(signals.website_url);
    let existingId: string | null = null;
    let signal: string | null = null;

    if (signals.phone_e164) {
      const { data } = await admin.from("verified_contractor_prospects")
        .select("id").eq("phone_e164", signals.phone_e164).limit(1).maybeSingle();
      if (data) { existingId = data.id; signal = "phone_e164"; }
    }
    if (!existingId && signals.email) {
      const { data } = await admin.from("verified_contractor_prospects")
        .select("id").ilike("email", signals.email).limit(1).maybeSingle();
      if (data) { existingId = data.id; signal = "email"; }
    }
    if (!existingId && domain) {
      const { data } = await admin.from("verified_contractor_prospects")
        .select("id").ilike("website_url", `%${domain}%`).limit(1).maybeSingle();
      if (data) { existingId = data.id; signal = "domain"; }
    }
    if (!existingId && signals.company_name && signals.city) {
      const { data } = await admin.from("verified_contractor_prospects")
        .select("id").ilike("business_name", signals.company_name).ilike("city", signals.city).limit(1).maybeSingle();
      if (data) { existingId = data.id; signal = "name_city"; }
    }

    /* ── 5a. Known entity: attach the new Facebook signal, never duplicate ── */
    if (existingId) {
      const { data: existing } = await admin.from("verified_contractor_prospects")
        .select("source_urls,intent_signal_score,email,website_url").eq("id", existingId).maybeSingle();

      const sources = Array.isArray(existing?.source_urls) ? existing!.source_urls as unknown[] : [];
      const patch: Record<string, unknown> = {
        source_urls: [...sources, {
          source: "unpro_scout",
          platform: "facebook_group",
          group_name: body.group_name ?? null,
          url: body.post_url ?? body.source_url ?? null,
          captured_at: new Date().toISOString(),
          snippet: rawText.slice(0, 400),
        }],
        last_action_at: new Date().toISOString(),
      };
      // Enrich only empty fields — never overwrite human/verified data.
      if (!existing?.email && signals.email) patch.email = signals.email;
      if (!existing?.website_url && signals.website_url) patch.website_url = signals.website_url;
      if (signals.intent_score > (existing?.intent_signal_score ?? 0)) {
        patch.intent_signal_score = signals.intent_score;
        patch.intent_evidence = signals.intent_evidence;
        patch.intent_source = "facebook_group";
      }
      await admin.from("verified_contractor_prospects").update(patch).eq("id", existingId);

      const { data: dupCapture } = await admin.from("scout_captures").insert({
        ...captureRow, dedupe_status: "duplicate", dedupe_signal: signal, prospect_id: existingId,
      }).select("id").single();
      // Canonical acquisition event. `channel`/`event_type` are constrained by
      // acquisition_events_*_check — Scout uses the allowed 'system'/'scraped'
      // pair and carries its own semantics in metadata.kind.
      await logAcquisitionEvent(admin, existingId, dupCapture?.id, {
        kind: "scout_rediscovered", signal, group_name: body.group_name ?? null,
        intent_score: signals.intent_score, extraction_mode: mode,
      });
      await bumpSession(admin, sessionId, { captured: 1, duplicate: 1 });
      return json({ status: "duplicate", prospect_id: existingId, signal, intent_score: signals.intent_score });
    }

    /* ── 5b. New prospect: enters the funnel unverified, gated as usual ── */
    const insertRow = {
      business_name: signals.company_name ?? signals.contact_name ?? "Entrepreneur Facebook (à confirmer)",
      category: signals.category ?? "general",
      city: signals.city,
      phone_primary: signals.phone_e164,
      phone_e164: signals.phone_e164,
      phone_validation_status: "unverified",
      sms_eligible: false,
      email: signals.email,
      website_url: signals.website_url,
      rbq_number: signals.rbq_number,
      verification_status: "needs_enrichment",
      data_quality_score: qualityScore(signals),
      source: "facebook_group",
      outreach_status: "none",
      intent_signal_score: signals.intent_score,
      intent_evidence: signals.intent_evidence,
      intent_source: signals.intent_score > 0 ? "facebook_group" : null,
      source_urls: [{
        source: "unpro_scout",
        platform: "facebook_group",
        group_name: body.group_name ?? null,
        url: body.post_url ?? body.source_url ?? null,
        captured_at: new Date().toISOString(),
        extraction_mode: mode,
        snippet: rawText.slice(0, 400),
      }],
    };

    const { data: created, error: insErr } = await admin
      .from("verified_contractor_prospects").insert(insertRow).select("id").single();

    if (insErr) {
      await admin.from("scout_captures").insert({ ...captureRow, dedupe_status: "error", error: insErr.message });
      await bumpSession(admin, sessionId, { captured: 1, error: 1 });
      return json({ status: "error", reason: insErr.message }, 200);
    }

    const { data: newCapture } = await admin.from("scout_captures").insert({
      ...captureRow, dedupe_status: "new", prospect_id: created.id,
    }).select("id").single();
    await logAcquisitionEvent(admin, created.id, newCapture?.id, {
      kind: "scout_discovered", group_name: body.group_name ?? null, extraction_mode: mode,
      intent_score: signals.intent_score, intent_evidence: signals.intent_evidence,
    });
    await bumpSession(admin, sessionId, { captured: 1, created: 1 });

    return json({ status: "new", prospect_id: created.id, intent_score: signals.intent_score, quality: insertRow.data_quality_score });
  } catch (e) {
    console.error("[scout-ingest]", e);
    return json({ error: "internal_error", message: String((e as Error)?.message ?? e) }, 500);
  }
});

async function bumpSession(
  admin: ReturnType<typeof createClient>,
  sessionId: string | null,
  d: { captured?: number; created?: number; duplicate?: number; error?: number },
) {
  if (!sessionId) return;
  const { data } = await admin.from("scout_sessions")
    .select("captured_count,new_count,duplicate_count,error_count").eq("id", sessionId).maybeSingle();
  if (!data) return;
  await admin.from("scout_sessions").update({
    captured_count: (data.captured_count ?? 0) + (d.captured ?? 0),
    new_count: (data.new_count ?? 0) + (d.created ?? 0),
    duplicate_count: (data.duplicate_count ?? 0) + (d.duplicate ?? 0),
    error_count: (data.error_count ?? 0) + (d.error ?? 0),
  }).eq("id", sessionId);
}

/**
 * Write the discovery into the canonical acquisition event log.
 * `channel` and `event_type` are constrained by acquisition_events_*_check, so
 * Scout reuses the allowed 'system' / 'scraped' pair; the Scout-specific
 * semantics live in metadata.kind. `source_row_id` is the capture id, which
 * satisfies uq_acq_events_source (source_table, source_row_id, event_type).
 */
async function logAcquisitionEvent(
  admin: ReturnType<typeof createClient>,
  prospectId: string,
  captureId: string | undefined,
  metadata: Record<string, unknown>,
) {
  const { error } = await admin.from("acquisition_events").insert({
    prospect_id: prospectId,
    channel: "system",
    event_type: "scraped",
    provider: "system",
    source_table: "scout_captures",
    source_row_id: captureId ?? null,
    metadata: { source: "unpro_scout", platform: "facebook_group", ...metadata },
  });
  // Never fail the capture on telemetry, but never hide the failure either.
  if (error) console.error("[scout-ingest] acquisition_event insert failed", error.message);
}

