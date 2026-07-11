// UNPRO — Kijiji daily orchestrator (06:00 Montreal via pg_cron).
// scrape → process → validate → queue P0 (dry_run by default).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));
  const dryRun: boolean = body.dry_run ?? false;

  const report: any = { started_at: new Date().toISOString(), steps: [] };

  // 1) Scrape
  const scrape = await invoke(sb, "scrape-kijiji-services", { max_pages: 2 });
  report.steps.push({ step: "scrape", ...scrape });

  // 2) Process discovered stubs
  const process = await invoke(sb, "process-kijiji-listing", { limit: 50 });
  report.steps.push({ step: "process", ...process });

  // 3) Validate contacts
  const validate = await invoke(sb, "validate-kijiji-contact", { limit: 50 });
  report.steps.push({ step: "validate", ...validate });

  // 4) Queue P0 (dry_run guard by default until human approves)
  const queue = await invoke(sb, "queue-kijiji-outreach", { bucket: "P0", limit: 25, dry_run: dryRun });
  report.steps.push({ step: "queue_p0", ...queue });

  report.completed_at = new Date().toISOString();
  return new Response(JSON.stringify(report), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function invoke(sb: any, name: string, body: any) {
  try {
    const { data, error } = await sb.functions.invoke(name, { body });
    if (error) return { error: error.message };
    return data;
  } catch (e) {
    return { error: String(e) };
  }
}
