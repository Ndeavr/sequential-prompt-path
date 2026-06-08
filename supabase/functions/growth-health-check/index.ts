// UNPRO — Growth Engine Health Check
// Returns a per-component truth report: WORKING | BLOCKED | PARTIAL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Status = "WORKING" | "BLOCKED" | "PARTIAL";
type Check = {
  component: string;
  status: Status;
  root_cause?: string | null;
  affected?: string | null;
  fix?: string | null;
  detail?: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const checks: Check[] = [];
  const has = (k: string) => !!Deno.env.get(k);

  // 1. Supabase connection
  try {
    const { error } = await sb.from("contractors").select("id", { head: true, count: "exact" }).limit(1);
    checks.push({
      component: "Supabase connection",
      status: error ? "BLOCKED" : "WORKING",
      root_cause: error?.message ?? null,
      affected: "public schema",
      fix: error ? "Vérifier SUPABASE_SERVICE_ROLE_KEY et RLS." : null,
    });
  } catch (e) {
    checks.push({ component: "Supabase connection", status: "BLOCKED", root_cause: String(e), fix: "Vérifier la connexion réseau." });
  }

  // 2. Required edge functions deployed (probe via OPTIONS)
  const funcs = ["growth-expansion-agent", "growth-outreach-agent", "growth-task-dispatcher"];
  for (const f of funcs) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/${f}`, { method: "OPTIONS" });
      checks.push({
        component: `Edge: ${f}`,
        status: r.ok ? "WORKING" : "BLOCKED",
        root_cause: r.ok ? null : `HTTP ${r.status}`,
        affected: f,
        fix: r.ok ? null : "Redéployer la fonction edge.",
      });
    } catch (e) {
      checks.push({ component: `Edge: ${f}`, status: "BLOCKED", root_cause: String(e), affected: f, fix: "Vérifier le déploiement." });
    }
  }

  // 3. Twilio credentials
  const twilioKey = has("TWILIO_API_KEY");
  const lovableKey = has("LOVABLE_API_KEY");
  if (!twilioKey || !lovableKey) {
    checks.push({
      component: "Twilio (SMS)",
      status: "BLOCKED",
      root_cause: !twilioKey ? "TWILIO_API_KEY manquant" : "LOVABLE_API_KEY manquant",
      affected: "growth-outreach-agent SMS",
      fix: "Connecter Twilio via Connectors. Sans cela, 0 SMS sera envoyé.",
    });
  } else {
    try {
      const r = await fetch("https://connector-gateway.lovable.dev/api/v1/verify_credentials", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "X-Connection-Api-Key": Deno.env.get("TWILIO_API_KEY")!,
        },
      });
      const body = await r.json().catch(() => ({}));
      const ok = r.ok && body?.outcome === "verified";
      checks.push({
        component: "Twilio (SMS)",
        status: ok ? "WORKING" : "BLOCKED",
        root_cause: ok ? null : body?.error ?? `HTTP ${r.status}`,
        affected: "growth-outreach-agent SMS",
        fix: ok ? null : "Reconnecter Twilio avec une clé API valide.",
      });
    } catch (e) {
      checks.push({ component: "Twilio (SMS)", status: "BLOCKED", root_cause: String(e), fix: "Reconnecter Twilio." });
    }
  }

  // 4. Email provider
  try {
    const { data, error } = await sb.from("email_domain_configs").select("domain").limit(1).maybeSingle();
    if (error) throw error;
    checks.push({
      component: "Email provider",
      status: data ? "WORKING" : "BLOCKED",
      root_cause: data ? null : "Aucun domaine email configuré",
      affected: "growth-outreach-agent EMAIL",
      fix: data ? null : "Configurer un domaine email (Cloud → Emails).",
    });
  } catch (e) {
    checks.push({ component: "Email provider", status: "PARTIAL", root_cause: String(e), fix: "Vérifier email_domain_configs." });
  }

  // 5. AI keys
  checks.push({
    component: "AI (Lovable / Gemini)",
    status: lovableKey ? "WORKING" : "BLOCKED",
    root_cause: lovableKey ? null : "LOVABLE_API_KEY manquant",
    fix: lovableKey ? null : "Activer Lovable AI dans Cloud.",
  });

  // 6. Google Maps (scout)
  checks.push({
    component: "Google Maps (Scout)",
    status: has("GOOGLE_MAPS_API_KEY") ? "WORKING" : "BLOCKED",
    root_cause: has("GOOGLE_MAPS_API_KEY") ? null : "GOOGLE_MAPS_API_KEY manquant",
    affected: "growth-expansion-agent",
    fix: has("GOOGLE_MAPS_API_KEY") ? null : "Connecter Google Maps via Connectors.",
  });

  // 7. Quotas
  const smsQ = parseInt(Deno.env.get("GROWTH_DAILY_SMS") ?? "50", 10);
  const emailQ = parseInt(Deno.env.get("GROWTH_DAILY_EMAIL") ?? "25", 10);
  checks.push({
    component: "Quotas quotidiens",
    status: smsQ > 0 && emailQ > 0 ? "WORKING" : "BLOCKED",
    detail: { sms: smsQ, email: emailQ },
    fix: smsQ > 0 ? null : "Augmenter GROWTH_DAILY_SMS.",
  });

  // 8. Cron jobs
  try {
    const { data } = await sb.rpc("get_growth_cron_jobs" as never).select("*" as never) as { data: unknown };
    checks.push({ component: "Cron jobs (pg_cron)", status: "WORKING", detail: data });
  } catch {
    // fallback: query via direct sql is not exposed; mark partial
    checks.push({
      component: "Cron jobs (pg_cron)",
      status: "PARTIAL",
      root_cause: "Vérification indirecte; les jobs growth-task-dispatcher / outreach sont planifiés via pg_cron.",
      fix: "Vérifier cron.job dans la console SQL si nécessaire.",
    });
  }

  // 9. Contractors available
  try {
    const { count } = await sb.from("contractors").select("id", { count: "exact", head: true }).eq("status", "active");
    checks.push({
      component: "Entrepreneurs actifs",
      status: (count ?? 0) > 0 ? "WORKING" : "BLOCKED",
      detail: { active: count ?? 0 },
      root_cause: (count ?? 0) > 0 ? null : "Aucun entrepreneur status='active' → rien à amplifier.",
      fix: (count ?? 0) > 0 ? null : "Activer au moins un entrepreneur (payment ou admin override).",
    });
  } catch (e) {
    checks.push({ component: "Entrepreneurs actifs", status: "BLOCKED", root_cause: String(e) });
  }

  // 10. Message templates (Visibilité IA sequences)
  try {
    const { count } = await sb.from("acq_email_sequences").select("id", { count: "exact", head: true }).eq("is_active", true);
    checks.push({
      component: "Séquences de messages",
      status: (count ?? 0) > 0 ? "WORKING" : "BLOCKED",
      detail: { active_sequences: count ?? 0 },
      fix: (count ?? 0) > 0 ? null : "Activer la séquence Visibilité IA.",
    });
  } catch (e) {
    checks.push({ component: "Séquences de messages", status: "PARTIAL", root_cause: String(e) });
  }

  // 11. Production truth: anything actually sent today?
  try {
    const { data } = await sb.from("v_growth_engine_today").select("*").maybeSingle();
    const live = !!(data as { is_production_live?: boolean } | null)?.is_production_live;
    checks.push({
      component: "Production live (messages réellement envoyés aujourd'hui)",
      status: live ? "WORKING" : "BLOCKED",
      detail: data,
      root_cause: live ? null : "0 SMS et 0 email envoyés aujourd'hui — le système est en simulation ou bloqué entre génération et envoi.",
      fix: live ? null : "Vérifier les credentials Twilio/email et la file 'waiting_approval'.",
    });
  } catch (e) {
    checks.push({ component: "Production live", status: "BLOCKED", root_cause: String(e) });
  }

  const overall: Status = checks.some((c) => c.status === "BLOCKED")
    ? "BLOCKED"
    : checks.some((c) => c.status === "PARTIAL")
    ? "PARTIAL"
    : "WORKING";

  return new Response(JSON.stringify({ overall, checks, generated_at: new Date().toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
