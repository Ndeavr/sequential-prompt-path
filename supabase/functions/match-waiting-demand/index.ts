// UNPRO Demand Intelligence — Match waiting demand when a contractor activates
// Triggered by the Stripe webhook (service role) or an admin "Re-run matching".
// Access: service role key, admin user, or a member of the target contractor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const start = Date.now();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  // Non-blocking journey logger — a failed log must never break matching.
  const logJourney = async (
    contractorId: string | null,
    eventType: string,
    metadata: Record<string, unknown>,
  ) => {
    try {
      const { error } = await sb.from("contractor_funnel_events").insert({
        contractor_id: contractorId,
        event_type: eventType,
        step: "matching",
        event_source: "match-waiting-demand",
        metadata,
      });
      if (error) console.error("[match-waiting-demand] journey log failed", eventType, error.message);
    } catch (e) {
      console.error("[match-waiting-demand] journey log threw", eventType, String(e));
    }
  };

  try {
    // ── AUTH ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ ok: false, error: "Authentification requise.", code: "unauthenticated" }, 401);

    let actorId: string | null = null;
    let isService = token === serviceKey;

    if (!isService) {
      const { data: userData, error: userErr } = await sb.auth.getUser(token);
      if (userErr || !userData?.user) {
        return json({ ok: false, error: "Session invalide.", code: "unauthenticated" }, 401);
      }
      actorId = userData.user.id;
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Corps de requête invalide.", code: "bad_request" }, 400);
    }
    const contractorId = typeof body.contractor_id === "string" ? body.contractor_id.trim() : "";
    if (!contractorId || !UUID_RE.test(contractorId)) {
      return json({ ok: false, error: "contractor_id requis.", code: "bad_request" }, 400);
    }

    if (!isService) {
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: actorId, _role: "admin" });
      if (!isAdmin) {
        const [{ data: member }, { data: owned }] = await Promise.all([
          sb.from("contractor_members").select("contractor_id").eq("contractor_id", contractorId)
            .eq("user_id", actorId!).maybeSingle(),
          sb.from("contractors").select("id").eq("id", contractorId).eq("user_id", actorId!).maybeSingle(),
        ]);
        if (!member && !owned) {
          return json({ ok: false, error: "Accès refusé.", code: "forbidden" }, 403);
        }
      }
    }

    // ── MATCHING ────────────────────────────────────────────────────────────
    await logJourney(contractorId, "matching_attempted", {
      actor: isService ? "service_role" : actorId,
    });

    const { data, error } = await sb.rpc("fn_match_waiting_demand", { _contractor_id: contractorId });
    if (error) {
      await logJourney(contractorId, "matching_failed", { reason: error.message });
      await sb.from("platform_operation_outcomes").insert({
        operation: "demand_matching",
        intent: "match_waiting_demand_after_activation",
        business_outcome: "failed",
        failure_code: "matching_rpc_error",
        affected_record: `contractors:${contractorId}`,
        service: "match-waiting-demand",
        next_action: "Relancer le rapprochement depuis l'administration",
        payload: { contractor_id: contractorId, reason: error.message },
      });
      return json({ ok: false, error: error.message, code: "matching_failed" }, 500);
    }

    const row = Array.isArray(data) ? data[0] : data;
    const matched = row?.matched_count ?? 0;
    const newlyMatched = row?.newly_matched_count ?? 0;
    const segments = row?.segments ?? [];

    // ── ÉTAT RÉELLEMENT ENREGISTRÉ ─────────────────────────────────────────
    // Lu après la mutation : c'est la seule source du résultat retourné.
    const { data: matchedRows } = await sb
      .from("demand_signals")
      .select("id, homeowner_id, city, category, project_id, updated_at")
      .eq("matched_contractor_id", contractorId)
      .eq("status", "matched")
      .order("updated_at", { ascending: false })
      .limit(200);

    const rows = matchedRows ?? [];

    // ── NOTIFICATIONS ──────────────────────────────────────────────────────
    // Résultat distinct du rapprochement. Un doublon (index unique) compte
    // comme déjà notifié; un échec réel reste reprenable par une relance.
    // demand_signals.homeowner_id = auth user id; notifications.profile_id = profiles.id.
    let notificationsSent = 0;
    let notificationsAlreadySent = 0;
    const notificationFailures: { demand_id: string; reason: string }[] = [];

    const ownerUserIds = [...new Set(rows.map((r) => r.homeowner_id).filter(Boolean))];
    const profileByUserId = new Map<string, string>();
    if (ownerUserIds.length > 0) {
      const { data: profileRows } = await sb
        .from("profiles")
        .select("id, user_id")
        .in("user_id", ownerUserIds);
      for (const p of profileRows ?? []) {
        if (p.user_id) profileByUserId.set(p.user_id, p.id);
      }
    }

    for (const s of rows) {
      const profileId = profileByUserId.get(s.homeowner_id);
      if (!profileId) {
        notificationFailures.push({ demand_id: s.id, reason: "profile_not_found" });
        console.error("[match-waiting-demand] notify skipped, no profile", s.id);
        continue;
      }
      const { error: nErr } = await sb.from("notifications").insert({
        profile_id: profileId,
        type: "demand_matched",
        channel: "in_app",
        title: "Une recommandation est prête",
        body: `Un entrepreneur compatible est maintenant disponible pour votre projet ${s.category} à ${s.city}.`,
        entity_type: "demand_signal",
        entity_id: s.id,
        metadata: { signal_id: s.id, contractor_id: contractorId, project_id: s.project_id },
      });
      if (!nErr) {
        notificationsSent += 1;
      } else if (nErr.code === "23505") {
        notificationsAlreadySent += 1;
      } else {
        notificationFailures.push({ demand_id: s.id, reason: nErr.message });
        console.error("[match-waiting-demand] notify failed", s.id, nErr.message);
      }
    }

    await logJourney(contractorId, matched > 0 ? "matching_succeeded" : "matching_no_result", {
      matched_count: matched,
      newly_matched_count: newlyMatched,
      notifications_sent: notificationsSent,
      notifications_failed: notificationFailures.length,
      segments,
      reason: matched > 0 ? null : "Aucune demande propriétaire en attente compatible",
      duration_ms: Date.now() - start,
    });

    // Journal canonique : demande(s), entrepreneur, résultat, raison, horodatage.
    const outcome = matched === 0
      ? "blocked"
      : notificationFailures.length > 0
        ? "partial"
        : "achieved";

    const { error: outcomeErr } = await sb.from("platform_operation_outcomes").insert({
      operation: "demand_matching",
      intent: "match_waiting_demand_after_activation",
      business_outcome: outcome,
      block_reason: matched > 0 ? null : "no_compatible_waiting_demand",
      failure_code: notificationFailures.length > 0 ? "notification_delivery_failed" : null,
      affected_record: `contractors:${contractorId}`,
      service: "match-waiting-demand",
      next_action: matched === 0
        ? "Ajouter territoires/services ou attendre une nouvelle demande"
        : notificationFailures.length > 0
          ? "Relancer le rapprochement pour reprendre les avis non transmis"
          : "Notifier l'entrepreneur et planifier le rendez-vous",
      payload: {
        contractor_id: contractorId,
        matched_count: matched,
        newly_matched_count: newlyMatched,
        notifications_sent: notificationsSent,
        notifications_already_sent: notificationsAlreadySent,
        notification_failures: notificationFailures,
        segments,
        demands: rows.slice(0, 50).map((d) => ({
          demand_id: d.id,
          city: d.city,
          category: d.category,
          project_id: d.project_id,
          matched_at: d.updated_at,
        })),
        reason: matched > 0
          ? "Territoire et service compatibles avec une demande en attente"
          : "Aucune demande propriétaire en attente compatible",
        duration_ms: Date.now() - start,
        logged_at: new Date().toISOString(),
      },
    });
    if (outcomeErr) {
      console.error("[match-waiting-demand] outcome log failed", outcomeErr.message);
    }

    return json({
      ok: true,
      matching: {
        matched_count: matched,
        newly_matched_count: newlyMatched,
        segments,
        matched_demands: rows.map((d) => d.id),
      },
      notifications: {
        sent: notificationsSent,
        already_sent: notificationsAlreadySent,
        failed: notificationFailures.length,
        failures: notificationFailures,
        resumable: notificationFailures.length > 0,
      },
      // Compatibilité avec les appelants existants.
      matched_count: matched,
      segments,
      matched_demands: rows.map((d) => d.id),
      outcome_logged: !outcomeErr,
      outcome_log_error: outcomeErr?.message ?? null,
      duration_ms: Date.now() - start,
    });
  } catch (e) {
    console.error("[match-waiting-demand] error", e);
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
