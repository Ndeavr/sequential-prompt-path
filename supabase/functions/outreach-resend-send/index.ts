// UNPRO — Hardened Resend sender. Service-role callers only (internal chain).
// All policy lives in ./handler.ts (fail-closed, tested in Vitest).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sanitizeTags } from "../_shared/resendTags.ts";
import { assertOutreachEnabled } from "../_shared/outreachGate.ts";
import { checkAutopilotGate } from "../_shared/autopilotGate.ts";
import { handleSend } from "./handler.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const USE_GATEWAY = RESEND_KEY.startsWith("lovc_");
const BASE = USE_GATEWAY ? "https://connector-gateway.lovable.dev/resend" : "https://api.resend.com";
const SENDER_DOMAIN = "mail.unpro.ca";

const sb = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

function providerHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (USE_GATEWAY) { h["Authorization"] = `Bearer ${LOVABLE_API_KEY}`; h["X-Connection-Api-Key"] = RESEND_KEY; }
  else h["Authorization"] = `Bearer ${RESEND_KEY}`;
  return h;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, reason: "METHOD_NOT_ALLOWED" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  let raw: unknown = null;
  const auth = req.headers.get("Authorization");
  try { raw = await req.json(); } catch { raw = null; }

  const res = await handleSend(auth, raw, {
    serviceRoleKey: SRK,
    founderEmail: Deno.env.get("FOUNDER_EMAIL") ?? "danny@unpro.ca",
    postalAddress: Deno.env.get("UNPRO_SENDER_POSTAL_ADDRESS") ?? "",
    unsubscribeBaseUrl: "https://unpro.ca/unsubscribe",
    senderFrom: `Clara d'UNPRO <clara@${SENDER_DOMAIN}>`,
    senderDomain: SENDER_DOMAIN,
    hasProviderKey: !!RESEND_KEY && (!USE_GATEWAY || !!LOVABLE_API_KEY),
    outreachEnabled: async () => (await assertOutreachEnabled(sb as any)).allowed,
    autopilotOpen: async () => { const g = await checkAutopilotGate(sb); return { allowed: g.allowed, reason: g.reason }; },
    senderDomainVerified: async (domain) => {
      const r = await fetch(`${BASE}/domains`, { headers: providerHeaders() });
      if (!r.ok) { await r.text(); return false; }
      const j = await r.json();
      return Array.isArray(j?.data) && j.data.some((x: any) => x?.name === domain && x?.status === "verified");
    },
    isSuppressed: async (email) => {
      const { data, error } = await sb.rpc("is_email_suppressed", { p_email: email });
      if (error || data !== false) return true;
      // /unsubscribe writes suppressed_emails, which suppression_index does not include.
      const { data: s, error: e2 } = await sb.from("suppressed_emails").select("email").eq("email", email).limit(1);
      if (e2) return true;
      return (s ?? []).length > 0;
    },
    hasReviewedEmailConsent: async (email) => {
      const { data, error } = await sb.from("casl_consent_evidence")
        .select("id, lawful_basis, source_url, retrieved_at, expires_at, refusal_statement_found")
        .eq("destination_type", "email").eq("destination_normalized", email).eq("is_valid", true)
        .not("reviewer_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error || !data) return false;
      return !!data.lawful_basis && String(data.source_url ?? "").startsWith("https://") && !!data.retrieved_at &&
        data.refusal_statement_found !== true && (!data.expires_at || new Date(data.expires_at) > new Date());
    },
    createUnsubscribeToken: async (email) => {
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const { error } = await sb.from("email_unsubscribe_tokens").insert({ token, email });
      if (error) throw error;
      return token;
    },
    claim: async (key, email, campaign) => {
      const { data, error } = await sb.rpc("claim_outreach_email", { p_key: key, p_recipient: email, p_campaign: campaign });
      if (error) throw error;
      return String(data);
    },
    settle: async (key, status, providerId, err) => {
      await sb.rpc("settle_outreach_email", { p_key: key, p_status: status, p_provider_id: providerId, p_error: err });
    },
    sha256: async (s) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
      .map((b) => b.toString(16).padStart(2, "0")).join(""),
    providerSend: async (payload) => {
      const r = await fetch(`${BASE}/emails`, { method: "POST", headers: providerHeaders(),
        body: JSON.stringify({ ...payload, tags: sanitizeTags(payload.tags as Record<string, string> | undefined) }) });
      const t = await r.text(); let b: any = null; try { b = JSON.parse(t); } catch { b = { message: t.slice(0, 300) }; }
      return { status: r.status, body: b };
    },
    log: async (row) => {
      try { await sb.from("email_send_log").insert(row); } catch (_) { /* never throw */ }
      if (row.status === "sent" || String(row.error_message ?? "").startsWith("RESEND_")) {
        try {
          await sb.from("outreach_health_state").upsert({ id: 1,
            resend_last_send_status: row.status === "sent" ? "sent" : "failed",
            resend_last_send_at: new Date().toISOString(),
            resend_last_send_id: (row.metadata as any)?.resend_id ?? null,
            resend_last_send_error: row.status === "sent" ? null : String(row.error_message).slice(0, 500) });
        } catch (_) {}
      }
    },
  });

  return new Response(JSON.stringify(res.body), { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
});
