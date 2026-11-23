/**
 * Clara SMS — inbound-only, allowlisted pilot (NO Lovable AI gateway).
 *
 * Invoked only by the Twilio-signature-validated twilio-inbound function.
 * Production is disabled unless CLARA_SMS_ENABLED=true AND the inbound sender
 * appears in CLARA_SMS_PILOT_ALLOWLIST. No campaign, autonomous follow-up, or
 * contact sharing. Reuses sms_messages and the canonical audited Twilio sender.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

type Inbound = { from?: string; to?: string; message_sid?: string; body?: string };
const CANONICAL_TO = "+14503286776";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const AI_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = Deno.env.get("CLARA_SMS_MODEL") || "gpt-4.1-mini";
const ALLOWLIST = new Set(
  (Deno.env.get("CLARA_SMS_PILOT_ALLOWLIST") ?? "")
    .split(/[\s,;]+/).map((v) => v.trim()).filter((v) => /^\+1\d{10}$/.test(v)),
);
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

function secureEquals(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

const SYSTEM = [
  "Tu es Clara, la seule assistante IA de UNPRO, au Québec.",
  "Tu réponds par SMS à une demande de rénovation initiée par le propriétaire.",
  "Réponds dans la langue du client (français québécois par défaut, anglais si utilisé).",
  "Réponds utilement au problème exprimé, puis pose UNE SEULE question pertinente.",
  "Réponses courtes: 1 à 3 phrases, 450 caractères maximum, sans formatage Markdown.",
  "Retiens les réponses précédentes. Demande seulement les détails manquants:",
  "nature du problème, municipalité/secteur, urgence, type de bâtiment, échéancier, budget approximatif.",
  "Évite de demander des coordonnées sensibles ou une adresse exacte par SMS.",
  "Ne prétends jamais avoir fait une inspection, vérifié un permis RBQ, consulté un calendrier,",
  "trouvé un entrepreneur, créé un rendez-vous ou confirmé un prix si ce n'est pas vérifié.",
  "Ne fournis pas de diagnostic certain ni de procédure dangereuse (électricité, structure, gaz).",
  "Si danger immédiat, recommande les services d'urgence et un professionnel qualifié.",
  "Ne génère aucun message commercial non sollicité, aucune soumission et aucun lien de paiement.",
  "La conversation seule ne déclenche aucune communication à des entrepreneurs tiers.",
].join(" ");

async function generateReply(history: Array<{ direction: string; message_body: string }>, body: string) {
  const messages = [
    { role: "system", content: SYSTEM },
    ...history.slice(-12).map((m) => ({
      role: m.direction === "outbound" ? "assistant" : "user",
      content: m.message_body.slice(0, 1000),
    })),
    { role: "user", content: body.slice(0, 1000) },
  ];
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: "Bearer " + AI_KEY, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, max_completion_tokens: 220 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("ai_http_" + response.status);
  const data = await response.json();
  const raw = String(data?.choices?.[0]?.message?.content ?? "").replace(/[*#\`]/g, "").trim();
  if (!raw) throw new Error("ai_empty");
  return raw.slice(0, 450);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  // Supabase service-role calls only. A public JWT or guessed function URL is insufficient.
  const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secureEquals(auth, SERVICE_KEY)) return json({ error: "unauthorized" }, 401);
  if (Deno.env.get("CLARA_SMS_ENABLED") !== "true" || ALLOWLIST.size === 0) {
    return json({ ok: true, status: "disabled" });
  }

  const { from = "", to = "", message_sid = "", body = "" } =
    (await req.json().catch(() => ({}))) as Inbound;
  if (!ALLOWLIST.has(from)) return json({ ok: true, status: "not_allowlisted" });
  if (to !== CANONICAL_TO || !/^\+1\d{10}$/.test(from) ||
      !/^(SM|MM)[a-f0-9]{32}$/i.test(message_sid) ||
      !body.trim() || body.length > 4000) {
    return json({ error: "invalid_inbound" }, 400);
  }
  if (/^(stop|arr[eê]t|unsubscribe|cancel|end|quit|help|aide)\b/i.test(body.trim())) {
    return json({ ok: true, status: "handled_by_inbound" });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Atomic claim of the webhook's already-persisted inbound row. Duplicate
  // provider retries cannot send a second reply for the same MessageSid.
  const { data: claimed, error: claimError } = await sb.from("sms_messages")
    .update({ status: "processing_clara", intent: "clara_homeowner" })
    .eq("message_sid", message_sid).eq("direction", "inbound").eq("status", "received")
    .select("id").maybeSingle();
  if (claimError) return json({ error: "claim_failed" }, 500);
  if (!claimed) return json({ ok: true, status: "already_processed_or_missing" });

  try {
    if (!AI_KEY) throw new Error("openai_key_missing");
    const windowStart = new Date(Date.now() - 86400000).toISOString();
    const { count, error: countErr } = await sb.from("sms_messages")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", from).eq("intent", "clara_homeowner")
      .eq("direction", "outbound").gte("created_at", windowStart);
    if (countErr) throw new Error("rate_limit_check_unavailable");
    if ((count ?? 0) >= 8) {
      await sb.from("sms_messages").update({ status: "clara_rate_limited" }).eq("id", claimed.id);
      return json({ ok: true, status: "rate_limited" });
    }

    const { data: rows, error: historyErr } = await sb.from("sms_messages")
      .select("message_body,direction,created_at")
      .eq("phone_number", from).eq("intent", "clara_homeowner")
      .neq("message_sid", message_sid)
      .in("direction", ["inbound", "outbound"])
      .order("created_at", { ascending: false }).limit(14);
    if (historyErr) throw new Error("history_unavailable");
    const history = (rows ?? []).reverse().map((r) => ({
      direction: String(r.direction),
      message_body: String(r.message_body ?? ""),
    }));

    const answer = await generateReply(history, body.trim());
    // User-initiated service response, never a prospecting send. Canonical
    // sender performs phone, opt-out, delivery-audit and callback checks.
    const result = await sendSms({
      to: from, body: answer, message_type: "transactional",
      template_key: "clara_inbound_sms_reply",
      metadata: { source: "clara-sms", inbound_sid: message_sid, user_initiated: true },
    });
    if (!["sending", "sent", "delivered"].includes(result.status) || !result.twilio_sid) {
      throw new Error("delivery_" + result.status);
    }
    const { error: outboundErr } = await sb.from("sms_messages").insert({
      prospect_id: null, message_sid: result.twilio_sid, phone_number: from,
      message_body: answer, direction: "outbound", intent: "clara_homeowner",
      provider: "twilio", status: "sent",
    });
    if (outboundErr) console.error("clara-sms: history write failed", { inbound_sid: message_sid });
    await sb.from("sms_messages").update({ status: "responded" }).eq("id", claimed.id);
    return json({ ok: true, status: "sent", outbound_sid: result.twilio_sid });
  } catch (error) {
    console.error("clara-sms failed", {
      inbound_sid: message_sid,
      reason: error instanceof Error ? error.message : "unknown",
    });
    await sb.from("sms_messages").update({ status: "clara_failed" }).eq("id", claimed.id);
    return json({ error: "clara_failed" }, 500);
  }
});
