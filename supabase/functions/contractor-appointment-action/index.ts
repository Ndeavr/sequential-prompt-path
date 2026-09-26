/**
 * contractor-appointment-action — public endpoint behind /rdv/:token.
 * op "view":    validates the unique link, records the click, returns a
 *               minimal appointment summary (no homeowner PII).
 * op "respond": applies the action tied to the link (accept / propose / decline).
 * One response per notification; later links become read-only.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
async function sha(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const token = String(body?.token ?? "");
  const op = body?.op === "respond" ? "respond" : "view";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return json({ ok: false, error: "invalid_link" }, 400);

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: tok } = await svc.from("appointment_action_tokens")
    .select("id, action, expires_at, clicked_at, notification_id").eq("token_hash", await sha(token)).maybeSingle();
  if (!tok) return json({ ok: false, error: "invalid_link" }, 404);
  if (new Date(tok.expires_at).getTime() < Date.now()) return json({ ok: false, error: "expired" }, 410);

  const { data: n } = await svc.from("appointment_contractor_notifications")
    .select("id, appointment_id, contractor_id, response, click_count, first_clicked_at, contractors(business_name, user_id)")
    .eq("id", tok.notification_id).single();
  const { data: appt } = await svc.from("appointments")
    .select("id, project_category, problem_summary, preferred_date, preferred_time_window, status, homeowner_user_id")
    .eq("id", n!.appointment_id).single();

  const summary = {
    action: tok.action,
    business_name: (n as any).contractors?.business_name ?? null,
    project: appt?.problem_summary || appt?.project_category || "Projet résidentiel",
    preferred_date: appt?.preferred_date ?? null,
    time_window: appt?.preferred_time_window ?? null,
    response: n!.response,
  };

  if (op === "view") {
    const bot = body?.prefetch === true;
    if (!bot) {
      const now = new Date().toISOString();
      if (!tok.clicked_at) await svc.from("appointment_action_tokens").update({ clicked_at: now }).eq("id", tok.id);
      await svc.from("appointment_contractor_notifications").update({
        click_count: (n!.click_count ?? 0) + 1, first_clicked_at: n!.first_clicked_at ?? now,
      }).eq("id", n!.id);
    }
    return json({ ok: true, ...summary });
  }

  if (n!.response) return json({ ok: false, error: "already_responded", ...summary }, 409);

  const now = new Date().toISOString();
  let patchAppt: Record<string, unknown> = {};
  let patchNotif: Record<string, unknown> = { responded_at: now };
  let homeownerMsg = "";
  if (tok.action === "accept") {
    patchAppt = { contractor_confirmed: true, status: "confirmed" };
    patchNotif.response = "accepted";
    homeownerMsg = "L'entrepreneur a accepté votre rendez-vous.";
  } else if (tok.action === "decline") {
    const reason = String(body?.reason ?? "").slice(0, 300) || null;
    patchAppt = { status: "declined", cancellation_reason: reason };
    patchNotif = { ...patchNotif, response: "declined", decline_reason: reason };
    homeownerMsg = "L'entrepreneur n'est pas disponible. UNPRO cherche la meilleure alternative compatible.";
  } else {
    const slots = (Array.isArray(body?.slots) ? body.slots : [])
      .map((s: any) => ({ date: String(s?.date ?? "").slice(0, 10), window: String(s?.window ?? "").slice(0, 40) }))
      .filter((s: any) => /^\d{4}-\d{2}-\d{2}$/.test(s.date))
      .slice(0, 3);
    if (slots.length === 0) return json({ ok: false, error: "slots_required" }, 400);
    patchAppt = { status: "reschedule_requested", reschedule_reason: "Plages proposées par l'entrepreneur" };
    patchNotif = { ...patchNotif, response: "proposed", proposed_slots: slots };
    homeownerMsg = "L'entrepreneur propose d'autres plages pour votre rendez-vous.";
  }

  const { error: aErr } = await svc.from("appointments").update(patchAppt).eq("id", appt!.id);
  if (aErr) return json({ ok: false, error: "update_failed" }, 500);
  await svc.from("appointment_contractor_notifications").update(patchNotif).eq("id", n!.id);
  await svc.from("appointment_action_tokens").update({ used_at: now }).eq("id", tok.id);

  if (appt?.homeowner_user_id) {
    const { data: prof } = await svc.from("profiles").select("id").eq("user_id", appt.homeowner_user_id).maybeSingle();
    if (prof?.id) {
      await svc.from("notifications").insert({
        profile_id: prof.id, type: `appointment_${patchNotif.response}`, title: "Mise à jour de votre rendez-vous",
        body: homeownerMsg, channel: "in_app", status: "pending", entity_type: "appointment", entity_id: appt.id,
        metadata: { notification_id: n!.id, proposed_slots: (patchNotif as any).proposed_slots ?? null },
      });
    }
  }
  return json({ ok: true, ...summary, response: patchNotif.response });
});
