// Resend key diagnostic — never logs the full key.
// Returns prefix/suffix/length + live Resend API responses.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function readBody(r: Response) {
  const raw = await r.text();
  try { return { json: JSON.parse(raw), raw }; } catch { return { json: null, raw }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const raw = Deno.env.get("RESEND_API_KEY") ?? "";
  const trimmed = raw.trim();
  const diag = {
    present: raw.length > 0,
    length: raw.length,
    trimmed_length: trimmed.length,
    has_whitespace: raw !== trimmed || /\s/.test(raw),
    starts_with_re_: trimmed.startsWith("re_"),
    prefix: trimmed.slice(0, 8),
    suffix: trimmed.slice(-4),
  };

  console.log("[resend.diagnose] prefix=", diag.prefix, "len=", diag.length, "ws=", diag.has_whitespace);

  let apiKeys: any = { status: 0, message: null, count: null, names: [] };
  let domains: any = { status: 0, message: null, count: null, verified: null, items: [] };

  // Lovable connector keys (lovc_…) are valid — they route via the Lovable gateway, not api.resend.com.
  // Direct calls to api.resend.com with a lovc_ key return 401 "API key is invalid" (a false negative).
  const isGatewayKey = trimmed.startsWith("lovc_");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

  const fetchResend = async (path: string) => {
    if (isGatewayKey) {
      if (!lovableKey) {
        return new Response(JSON.stringify({ message: "LOVABLE_API_KEY missing for gateway routing" }), { status: 500 });
      }
      return fetch(`https://connector-gateway.lovable.dev/resend${path}`, {
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": trimmed },
      });
    }
    return fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${trimmed}` } });
  };

  if (trimmed) {
    try {
      const r = await fetchResend("/api-keys");
      const b = await readBody(r);
      apiKeys = {
        status: r.status,
        message: b.json?.message ?? null,
        name: b.json?.name ?? null,
        count: Array.isArray(b.json?.data) ? b.json.data.length : null,
        names: Array.isArray(b.json?.data) ? b.json.data.map((k: any) => ({ id: k.id, name: k.name })) : [],
        raw_excerpt: b.raw.slice(0, 300),
      };
    } catch (e) { apiKeys = { status: -1, message: String(e) }; }

    try {
      const r = await fetchResend("/domains");
      const b = await readBody(r);
      const items = Array.isArray(b.json?.data) ? b.json.data : [];
      const verified = items.find((d: any) => d?.status === "verified") ?? null;
      domains = {
        status: r.status,
        message: b.json?.message ?? null,
        name: b.json?.name ?? null,
        count: items.length,
        verified: verified?.name ?? null,
        items: items.map((d: any) => ({ name: d.name, status: d.status, region: d.region })),
        raw_excerpt: b.raw.slice(0, 300),
      };
    } catch (e) { domains = { status: -1, message: String(e) }; }
  }

  // Persist
  await supabase.from("outreach_health_state").upsert({
    id: 1,
    resend_key_prefix: diag.prefix || null,
    resend_key_length: diag.length || null,
    resend_last_checked_at: new Date().toISOString(),
    resend_last_error: apiKeys.status === 200 && domains.status === 200
      ? null
      : `api-keys HTTP ${apiKeys.status} ${apiKeys.message ?? ""} | domains HTTP ${domains.status} ${domains.message ?? ""}`.slice(0, 500),
  });

  // Root cause classification
  let root_cause = "unknown";
  let repair = "manual_required";
  if (!diag.present) { root_cause = "missing_secret"; repair = "add_secret RESEND_API_KEY"; }
  else if (trimmed.startsWith("lovc_") && (apiKeys.status >= 200 && apiKeys.status < 300)) { root_cause = "ok_gateway"; repair = "none (Lovable connector key via gateway)"; }
  else if (trimmed.startsWith("lovc_")) { root_cause = "gateway_unreachable"; repair = `Lovable gateway returned HTTP ${apiKeys.status}. Check LOVABLE_API_KEY or reconnect the Resend connector.`; }
  else if (diag.has_whitespace) { root_cause = "whitespace_corruption"; repair = "Re-save secret without whitespace/newline"; }
  else if (apiKeys.status === 401 || apiKeys.status === 403) { root_cause = "revoked_key_or_no_scope"; repair = "Rotate RESEND_API_KEY (Full access)"; }
  else if (apiKeys.status === 400 && (apiKeys.message ?? "").toLowerCase().includes("invalid")) { root_cause = "revoked_or_unknown_key"; repair = "Regenerate key in Resend dashboard, then update_secret RESEND_API_KEY"; }
  else if (domains.status >= 200 && domains.status < 300 && !domains.verified) { root_cause = "no_verified_domain"; repair = "Verify a sending domain in Resend"; }
  else if (apiKeys.status === 200 || (domains.status >= 200 && domains.status < 300)) { root_cause = "ok"; repair = "none"; }

  return new Response(JSON.stringify({
    diag, api_keys: apiKeys, domains, root_cause, repair,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
