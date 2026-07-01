// UNPRO — Admin Ops Health Check
// Idempotent scanner. Upserts admin_system_checks + writes safe dry-run jobs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Status = "healthy" | "warning" | "critical" | "unknown";

interface CheckResult {
  check_key: string;
  label: string;
  category: string;
  status: Status;
  affected_count: number;
  recommended_action: string;
  repair_route: string;
  metadata?: Record<string, unknown>;
  sample?: unknown[];
  safe_auto_fix?: boolean;
  risk_level?: "safe" | "review" | "danger";
}

function classify(count: number, warnAt: number, critAt: number): Status {
  if (count >= critAt) return "critical";
  if (count >= warnAt) return "warning";
  return "healthy";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: CheckResult[] = [];

  async function count(table: string, filter: (q: any) => any): Promise<number> {
    try {
      const q = filter(supabase.from(table).select("*", { count: "exact", head: true }));
      const { count: c, error } = await q;
      if (error) {
        console.log(`count ${table} error:`, error.message);
        return 0;
      }
      return c ?? 0;
    } catch (e) {
      console.log(`count ${table} threw:`, e);
      return 0;
    }
  }

  async function sample(table: string, cols: string, filter: (q: any) => any, limit = 20) {
    try {
      const q = filter(supabase.from(table).select(cols)).limit(limit);
      const { data, error } = await q;
      if (error) return [];
      return data ?? [];
    } catch {
      return [];
    }
  }

  // 1. Company names with whitespace issues
  {
    const c = await count("contractor_leads", (q) =>
      q.or("business_name.ilike.% ,business_name.ilike., %,business_name.like.%  %"),
    );
    const s = await sample("contractor_leads", "id,business_name", (q) =>
      q.or("business_name.ilike.% ,business_name.ilike., %"),
    );
    results.push({
      check_key: "data.company_whitespace",
      label: "Noms d'entreprise avec espaces",
      category: "data_quality",
      status: classify(c, 5, 50),
      affected_count: c,
      recommended_action: "Appliquer nettoyage (trim + collapse spaces)",
      repair_route: "/admin/normalization",
      sample: s,
      safe_auto_fix: true,
      risk_level: "safe",
    });
  }

  // 2. Phones not E.164
  {
    const c = await count("contractor_leads", (q) =>
      q.not("phone", "is", null).or("phone_e164.is.null,phone_normalization_status.eq.invalid"),
    );
    const s = await sample("contractor_leads", "id,phone,phone_e164,phone_normalization_status", (q) =>
      q.not("phone", "is", null).is("phone_e164", null),
    );
    results.push({
      check_key: "data.phone_not_e164",
      label: "Téléphones non normalisés E.164",
      category: "data_quality",
      status: classify(c, 20, 100),
      affected_count: c,
      recommended_action: "Lancer la normalisation téléphonique",
      repair_route: "/admin/normalization",
      sample: s,
      safe_auto_fix: true,
      risk_level: "safe",
    });
  }

  // 3. Websites missing https / normalization
  {
    const c = await count("contractor_leads", (q) =>
      q.not("website", "is", null).is("website_normalized", null),
    );
    const s = await sample("contractor_leads", "id,website,website_normalized", (q) =>
      q.not("website", "is", null).is("website_normalized", null),
    );
    results.push({
      check_key: "data.website_unnormalized",
      label: "Sites web non normalisés (https/www)",
      category: "data_quality",
      status: classify(c, 20, 100),
      affected_count: c,
      recommended_action: "Appliquer la normalisation URL",
      repair_route: "/admin/normalization",
      sample: s,
      safe_auto_fix: true,
      risk_level: "safe",
    });
  }

  // 4. Leads pending validation >48h
  {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const c = await count("contractor_leads", (q) =>
      q.eq("normalization_status", "pending").lt("created_at", cutoff),
    );
    results.push({
      check_key: "acquisition.leads_pending_validation",
      label: "Leads en attente de validation >48h",
      category: "acquisition",
      status: classify(c, 10, 50),
      affected_count: c,
      recommended_action: "Relancer la validation téléphone/email",
      repair_route: "/admin/recovery-sprint",
      safe_auto_fix: false,
      risk_level: "review",
    });
  }

  // 5. Prospects stuck invalid
  {
    const c = await count("contractor_leads", (q) => q.eq("normalization_status", "rejected"));
    results.push({
      check_key: "acquisition.leads_rejected",
      label: "Leads rejetés (aucun contact)",
      category: "acquisition",
      status: classify(c, 20, 100),
      affected_count: c,
      recommended_action: "Ouvrir cockpit d'enrichissement",
      repair_route: "/admin/recovery-sprint",
      safe_auto_fix: false,
      risk_level: "review",
    });
  }

  // 6. Contractors paid but not active
  {
    const c = await count("contractors", (q) =>
      q.eq("stripe_subscription_status", "active").neq("profile_status", "active"),
    );
    const s = await sample("contractors", "id,business_name,profile_status,stripe_subscription_status", (q) =>
      q.eq("stripe_subscription_status", "active").neq("profile_status", "active"),
    );
    results.push({
      check_key: "revenue.paid_not_active",
      label: "Entrepreneurs payés mais inactifs",
      category: "revenue",
      status: c > 0 ? "critical" : "healthy",
      affected_count: c,
      recommended_action: "Activer les profils payés",
      repair_route: "/admin/revenue-gate-audit",
      sample: s,
      safe_auto_fix: false,
      risk_level: "review",
    });
  }

  // 7. Contractors active but missing city/category
  {
    const c = await count("contractors", (q) =>
      q.eq("profile_status", "active").or("city.is.null,primary_category.is.null"),
    );
    results.push({
      check_key: "publishing.active_missing_meta",
      label: "Profils actifs sans ville/catégorie",
      category: "publishing",
      status: classify(c, 3, 20),
      affected_count: c,
      recommended_action: "Compléter les métadonnées de profil",
      repair_route: "/admin/contractors",
      safe_auto_fix: false,
      risk_level: "review",
    });
  }

  // 8. Outreach sent but no tracking row
  {
    let c = 0;
    try {
      const { data, error } = await supabase.rpc("count_outreach_without_tracking" as any);
      if (!error && typeof data === "number") c = data;
    } catch { /* optional RPC */ }
    if (c === 0) {
      // Fallback: count last 24h contractor_outreach_logs with status=sent
      const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      c = await count("contractor_outreach_logs", (q) =>
        q.eq("status", "sent").gt("created_at", cutoff),
      );
    }
    results.push({
      check_key: "tracking.outreach_no_events",
      label: "Envois sans événement de suivi (24h)",
      category: "delivery",
      status: "unknown",
      affected_count: c,
      recommended_action: "Vérifier webhooks Twilio/Resend et redirect tracker",
      repair_route: "/admin/revenue-intelligence",
      safe_auto_fix: false,
      risk_level: "review",
    });
  }

  // 9. Demand signals waiting w/o recruitment target
  {
    let c = 0;
    try {
      c = await count("demand_signals", (q) => q.eq("status", "waiting"));
    } catch { /* table may not exist */ }
    results.push({
      check_key: "demand.waiting_signals",
      label: "Signaux de demande en attente",
      category: "demand",
      status: classify(c, 5, 30),
      affected_count: c,
      recommended_action: "Recomputer les cibles de recrutement",
      repair_route: "/admin/demand-grid",
      safe_auto_fix: false,
      risk_level: "review",
    });
  }

  // Upsert into admin_system_checks + create dry-run jobs
  const now = new Date().toISOString();
  const rows = results.map((r) => ({
    check_key: r.check_key,
    label: r.label,
    category: r.category,
    status: r.status,
    affected_count: r.affected_count,
    last_checked_at: now,
    recommended_action: r.recommended_action,
    repair_route: r.repair_route,
    metadata: { sample_size: (r.sample ?? []).length, safe_auto_fix: !!r.safe_auto_fix },
  }));

  const { error: upErr } = await supabase
    .from("admin_system_checks")
    .upsert(rows, { onConflict: "check_key" });
  if (upErr) console.log("upsert checks err:", upErr.message);

  // Emit dry-run job per safe check with issues
  for (const r of results) {
    if (r.safe_auto_fix && r.affected_count > 0) {
      await supabase.from("admin_repair_jobs").insert({
        job_type: r.check_key,
        status: "dry_run_completed",
        risk_level: r.risk_level ?? "safe",
        affected_count: r.affected_count,
        sample_diff: r.sample ?? [],
        summary: { source: "admin-ops-health-check", recommended_action: r.recommended_action },
      });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, checks: results.length, scanned_at: now, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
