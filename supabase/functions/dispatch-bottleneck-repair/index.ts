// dispatch-bottleneck-repair — safe writes only, no messages sent. dry_run default true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALL_ACTIONS = [
  "retry_stuck_validation",
  "requeue_orphaned",
  "restart_stalled_workers",
  "clear_dead_queue_locks",
  "renormalize_phones",
  "reenrich_missing_contact",
] as const;
type Action = typeof ALL_ACTIONS[number];

function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return /^\+\d{10,15}$/.test(digits) ? digits : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body.dry_run !== false; // default true
    const requested: Action[] = Array.isArray(body.actions) && body.actions.length > 0
      ? body.actions.filter((a: string) => (ALL_ACTIONS as readonly string[]).includes(a))
      : [...ALL_ACTIONS];
    const runId = crypto.randomUUID();

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const log = async (action: Action, before: number, after: number, error: string | null, details: any = {}) => {
      await sb.from("outreach_repair_actions").insert({
        run_id: runId, action, dry_run: dryRun, before_count: before, after_count: after, error, details,
      });
    };

    const results: any[] = [];

    // 1. retry_stuck_validation
    if (requested.includes("retry_stuck_validation")) {
      const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
      const { data: rows = [] } = await sb.from("contractor_leads")
        .select("id, metadata_json")
        .not("phone", "is", null)
        .lt("updated_at", cutoff)
        .filter("metadata_json->>phone_type", "is", null)
        .limit(500);
      const before = rows.length;
      let after = before;
      if (!dryRun && before > 0) {
        for (const r of rows as any[]) {
          const meta = r.metadata_json ?? {};
          delete meta.last_lookup_error;
          meta.needs_lookup_retry = true;
          await sb.from("contractor_leads").update({ metadata_json: meta, updated_at: new Date().toISOString() }).eq("id", r.id);
        }
      }
      await log("retry_stuck_validation", before, after, null, { dry_run: dryRun });
      results.push({ action: "retry_stuck_validation", before, after, dry_run: dryRun });
    }

    // 2. requeue_orphaned
    if (requested.includes("requeue_orphaned")) {
      const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
      const { data: rows = [], count } = await sb.from("contractor_leads")
        .select("id", { count: "exact" })
        .eq("outreach_status", "none")
        .not("phone", "is", null)
        .lt("created_at", cutoff)
        .limit(500);
      const before = count ?? rows.length;
      let after = before;
      if (!dryRun && rows.length > 0) {
        const ids = (rows as any[]).map((r) => r.id);
        const { error } = await sb.from("contractor_leads")
          .update({ lead_status: "ready_for_contact", updated_at: new Date().toISOString() })
          .in("id", ids);
        if (error) {
          await log("requeue_orphaned", before, before, error.message);
          results.push({ action: "requeue_orphaned", before, after: before, error: error.message, dry_run: dryRun });
        } else {
          await log("requeue_orphaned", before, after, null);
          results.push({ action: "requeue_orphaned", before, after, dry_run: dryRun });
        }
      } else {
        await log("requeue_orphaned", before, after, null);
        results.push({ action: "requeue_orphaned", before, after, dry_run: dryRun });
      }
    }

    // 3. restart_stalled_workers
    if (requested.includes("restart_stalled_workers")) {
      const { data: hs } = await sb.from("outreach_health_state").select("updated_at").eq("id", 1).maybeSingle();
      const stalled = hs && (Date.now() - new Date(hs.updated_at).getTime() > 15 * 60_000);
      const before = stalled ? 1 : 0;
      let after = before;
      if (!dryRun && stalled) {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/outreach-repair-agent`, {
            method: "POST",
            headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          });
          after = 0;
        } catch (e) {
          await log("restart_stalled_workers", before, before, String(e));
        }
      }
      await log("restart_stalled_workers", before, after, null);
      results.push({ action: "restart_stalled_workers", before, after, dry_run: dryRun });
    }

    // 4. clear_dead_queue_locks
    if (requested.includes("clear_dead_queue_locks")) {
      const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data: rows = [], count } = await sb.from("alex_outreach_queue")
        .select("id", { count: "exact" })
        .eq("status", "pending")
        .lt("scheduled_at", cutoff)
        .limit(500);
      const before = count ?? rows.length;
      let after = before;
      if (!dryRun && rows.length > 0) {
        const ids = (rows as any[]).map((r) => r.id);
        await sb.from("alex_outreach_queue")
          .update({ scheduled_at: new Date().toISOString() })
          .in("id", ids);
      }
      await log("clear_dead_queue_locks", before, after, null);
      results.push({ action: "clear_dead_queue_locks", before, after, dry_run: dryRun });
    }

    // 5. renormalize_phones
    if (requested.includes("renormalize_phones")) {
      const { data: rows = [] } = await sb.from("contractor_leads")
        .select("id, phone, mobile_phone")
        .or("phone.not.is.null,mobile_phone.not.is.null")
        .limit(1000);
      let before = 0, after = 0;
      const updates: any[] = [];
      for (const r of rows as any[]) {
        for (const col of ["phone", "mobile_phone"] as const) {
          const v = r[col];
          if (!v) continue;
          const norm = toE164(v);
          if (norm && norm !== v) {
            before++;
            updates.push({ id: r.id, col, norm });
          }
        }
      }
      if (!dryRun) {
        for (const u of updates) {
          await sb.from("contractor_leads").update({ [u.col]: u.norm }).eq("id", u.id);
          after++;
        }
      } else {
        after = before;
      }
      await log("renormalize_phones", before, after, null, { sample: updates.slice(0, 5) });
      results.push({ action: "renormalize_phones", before, after, dry_run: dryRun });
    }

    // 6. reenrich_missing_contact
    if (requested.includes("reenrich_missing_contact")) {
      const { data: rows = [], count } = await sb.from("contractor_leads")
        .select("id, website_url, company_name", { count: "exact" })
        .is("email", null)
        .is("phone", null)
        .is("mobile_phone", null)
        .or("website_url.not.is.null,company_name.not.is.null")
        .limit(500);
      const before = count ?? rows.length;
      let after = 0;
      if (!dryRun && rows.length > 0) {
        for (const r of rows as any[]) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/acq-enrich-contractor`, {
              method: "POST",
              headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
              body: JSON.stringify({ lead_id: r.id }),
            });
            after++;
          } catch { /* keep going */ }
        }
      } else {
        after = before;
      }
      await log("reenrich_missing_contact", before, after, null);
      results.push({ action: "reenrich_missing_contact", before, after, dry_run: dryRun });
    }

    return new Response(JSON.stringify({ run_id: runId, dry_run: dryRun, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[dispatch-bottleneck-repair]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
