// Founder Verification — health snapshot across all critical dependencies
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Status = "green" | "yellow" | "red";
type Check = {
  module: string;
  target: string;
  status: Status;
  latency_ms: number;
  quota_remaining?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  probable_cause?: string | null;
  proposed_fix?: string | null;
  auto_fixable?: boolean;
  metadata?: Record<string, unknown>;
};

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; value?: T; error?: any }> {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { ms: Date.now() - t0, value };
  } catch (error) {
    return { ms: Date.now() - t0, error };
  }
}

function envOr(name: string) {
  return Deno.env.get(name);
}

async function checkSupabase(admin: ReturnType<typeof createClient>): Promise<Check> {
  const r = await timed(() => admin.from("auto_fix_policies").select("id", { head: true, count: "exact" }));
  if (r.error || (r.value as any)?.error) {
    return {
      module: "supabase", target: "postgres", status: "red", latency_ms: r.ms,
      error_message: String(r.error || (r.value as any)?.error?.message),
      probable_cause: "DB unreachable ou clé service_role invalide",
      proposed_fix: "Vérifier SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { module: "supabase", target: "postgres", status: r.ms < 800 ? "green" : "yellow", latency_ms: r.ms };
}

async function checkStripe(): Promise<Check> {
  const key = envOr("STRIPE_SECRET_KEY");
  if (!key) return { module: "stripe", target: "api", status: "red", latency_ms: 0, error_code: "missing_secret", probable_cause: "STRIPE_SECRET_KEY absent", proposed_fix: "Ajouter STRIPE_SECRET_KEY dans secrets" };
  const r = await timed(() => fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } }));
  const res = r.value as Response | undefined;
  if (!res || !res.ok) return { module: "stripe", target: "api", status: "red", latency_ms: r.ms, error_code: String(res?.status ?? "network"), error_message: res ? await res.text().catch(() => "") : String(r.error), probable_cause: "Clé Stripe invalide ou réseau", proposed_fix: "Rotation STRIPE_SECRET_KEY" };
  return { module: "stripe", target: "api", status: r.ms < 1000 ? "green" : "yellow", latency_ms: r.ms };
}

async function checkLovableAI(): Promise<Check> {
  const key = envOr("LOVABLE_API_KEY");
  if (!key) return { module: "api", target: "lovable_ai", status: "red", latency_ms: 0, error_code: "missing_secret", probable_cause: "LOVABLE_API_KEY absent", proposed_fix: "Provisionner LOVABLE_API_KEY" };
  const r = await timed(() => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: "ping" }], max_tokens: 4 }),
  }));
  const res = r.value as Response | undefined;
  if (!res) return { module: "api", target: "lovable_ai", status: "red", latency_ms: r.ms, error_message: String(r.error), proposed_fix: "Vérifier connectivité" };
  if (res.status === 429) return { module: "api", target: "lovable_ai", status: "yellow", latency_ms: r.ms, error_code: "429", probable_cause: "Rate limit Lovable AI", proposed_fix: "Attendre ou upgrader plan", auto_fixable: true };
  if (res.status === 402) return { module: "api", target: "lovable_ai", status: "red", latency_ms: r.ms, error_code: "402", probable_cause: "Crédits Lovable AI épuisés", proposed_fix: "Recharger crédits" };
  if (!res.ok) return { module: "api", target: "lovable_ai", status: "red", latency_ms: r.ms, error_code: String(res.status), error_message: await res.text().catch(() => "") };
  return { module: "api", target: "lovable_ai", status: r.ms < 2000 ? "green" : "yellow", latency_ms: r.ms };
}

async function checkTwilio(): Promise<Check> {
  const key = envOr("TWILIO_API_KEY");
  const lk = envOr("LOVABLE_API_KEY");
  if (!key || !lk) return { module: "sms", target: "twilio", status: "yellow", latency_ms: 0, error_code: "missing_secret", probable_cause: "Twilio non connecté", proposed_fix: "Connecter Twilio dans Connectors" };
  const r = await timed(() => fetch("https://connector-gateway.lovable.dev/twilio/Accounts.json", {
    headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": key },
  }));
  const res = r.value as Response | undefined;
  if (!res || !res.ok) return { module: "sms", target: "twilio", status: "red", latency_ms: r.ms, error_code: String(res?.status ?? "network"), error_message: res ? await res.text().catch(() => "") : String(r.error), probable_cause: "Twilio creds invalides", proposed_fix: "Reconnecter Twilio" };
  return { module: "sms", target: "twilio", status: "green", latency_ms: r.ms };
}

async function checkGoogleMaps(): Promise<Check> {
  const key = envOr("GOOGLE_MAPS_API_KEY") || envOr("GOOGLE_PLACES_API_KEY");
  if (!key) return { module: "scraping", target: "google_maps", status: "yellow", latency_ms: 0, error_code: "missing_secret", probable_cause: "GOOGLE_MAPS_API_KEY absent", proposed_fix: "Ajouter GOOGLE_MAPS_API_KEY" };
  const r = await timed(() => fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=montreal&inputtype=textquery&fields=place_id&key=${key}`));
  const res = r.value as Response | undefined;
  if (!res || !res.ok) return { module: "scraping", target: "google_maps", status: "red", latency_ms: r.ms, error_code: String(res?.status ?? "network") };
  const body = await res.json().catch(() => ({}));
  if (body.status === "REQUEST_DENIED") return { module: "scraping", target: "google_maps", status: "red", latency_ms: r.ms, error_code: "REQUEST_DENIED", error_message: body.error_message, probable_cause: "Clé Google invalide ou Places API désactivée", proposed_fix: "Activer Places API + restrictions" };
  return { module: "scraping", target: "google_maps", status: "green", latency_ms: r.ms, metadata: { gstatus: body.status } };
}

async function checkFirecrawl(): Promise<Check> {
  const key = envOr("FIRECRAWL_API_KEY");
  if (!key) return { module: "scraping", target: "firecrawl", status: "yellow", latency_ms: 0, error_code: "missing_secret", probable_cause: "FIRECRAWL_API_KEY absent", proposed_fix: "Connecter Firecrawl" };
  const r = await timed(() => fetch("https://api.firecrawl.dev/v2/team/credit-usage", { headers: { Authorization: `Bearer ${key}` } }));
  const res = r.value as Response | undefined;
  if (!res) return { module: "scraping", target: "firecrawl", status: "red", latency_ms: r.ms };
  if (res.status === 402) return { module: "scraping", target: "firecrawl", status: "red", latency_ms: r.ms, error_code: "402", probable_cause: "Crédits Firecrawl épuisés", proposed_fix: "Recharger Firecrawl" };
  if (!res.ok) return { module: "scraping", target: "firecrawl", status: "yellow", latency_ms: r.ms, error_code: String(res.status) };
  const body = await res.json().catch(() => ({}));
  const remaining = body?.data?.remaining_credits;
  return { module: "scraping", target: "firecrawl", status: "green", latency_ms: r.ms, quota_remaining: remaining != null ? String(remaining) : null };
}

async function checkElevenLabs(): Promise<Check> {
  const key = envOr("ELEVENLABS_API_KEY");
  if (!key) return { module: "api", target: "elevenlabs", status: "yellow", latency_ms: 0, error_code: "missing_secret" };
  const r = await timed(() => fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": key } }));
  const res = r.value as Response | undefined;
  if (!res || !res.ok) return { module: "api", target: "elevenlabs", status: "red", latency_ms: r.ms, error_code: String(res?.status ?? "network") };
  const body = await res.json().catch(() => ({}));
  const remaining = body.character_limit != null ? `${body.character_limit - body.character_count} chars` : null;
  return { module: "api", target: "elevenlabs", status: "green", latency_ms: r.ms, quota_remaining: remaining };
}

async function checkResend(): Promise<Check> {
  const key = envOr("RESEND_API_KEY");
  if (!key) return { module: "email", target: "resend", status: "yellow", latency_ms: 0, error_code: "missing_secret", probable_cause: "RESEND_API_KEY absent (peut utiliser Lovable Emails)", proposed_fix: "Configurer email domain" };
  const r = await timed(() => fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } }));
  const res = r.value as Response | undefined;
  if (!res || !res.ok) return { module: "email", target: "resend", status: "red", latency_ms: r.ms, error_code: String(res?.status ?? "network") };
  return { module: "email", target: "resend", status: "green", latency_ms: r.ms };
}

async function checkPipelineHealth(admin: ReturnType<typeof createClient>): Promise<Check[]> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const out: Check[] = [];

  // outbound queue
  try {
    const { count: pending } = await admin.from("acq_prospects" as any).select("id", { head: true, count: "exact" }).eq("status", "pending");
    out.push({
      module: "onboarding", target: "acq_pipeline",
      status: (pending ?? 0) > 5000 ? "yellow" : "green", latency_ms: 0,
      quota_remaining: `${pending ?? 0} en attente`, metadata: { pending },
    });
  } catch { /* ignore */ }

  // email log last 24h
  try {
    const { data } = await admin.from("email_send_log" as any).select("status").gte("created_at", since);
    const rows = data ?? [];
    const failed = rows.filter((r: any) => ["dlq", "failed", "bounced"].includes(r.status)).length;
    const total = rows.length || 1;
    const rate = failed / total;
    out.push({
      module: "email", target: "deliverability_24h",
      status: rate > 0.1 ? "red" : rate > 0.03 ? "yellow" : "green",
      latency_ms: 0,
      metadata: { total, failed, fail_rate: Number(rate.toFixed(3)) },
      probable_cause: rate > 0.03 ? "Bounces élevés" : null,
      proposed_fix: rate > 0.03 ? "Vérifier domaine d'envoi et liste suppression" : null,
    });
  } catch { /* ignore */ }

  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const results = await Promise.all([
      checkSupabase(admin),
      checkStripe(),
      checkLovableAI(),
      checkTwilio(),
      checkGoogleMaps(),
      checkFirecrawl(),
      checkElevenLabs(),
      checkResend(),
    ]);
    const pipeline = await checkPipelineHealth(admin);
    const all = [...results, ...pipeline];

    // Persist snapshot
    const { error: insErr } = await admin.from("founder_health_checks").insert(
      all.map((c) => ({
        module: c.module,
        target: c.target,
        status: c.status,
        latency_ms: c.latency_ms,
        quota_remaining: c.quota_remaining ?? null,
        error_code: c.error_code ?? null,
        error_message: c.error_message ?? null,
        probable_cause: c.probable_cause ?? null,
        proposed_fix: c.proposed_fix ?? null,
        auto_fixable: c.auto_fixable ?? false,
        metadata: c.metadata ?? {},
      })),
    );

    return new Response(JSON.stringify({ checks: all, persisted: !insErr, persist_error: insErr?.message ?? null, taken_at: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
