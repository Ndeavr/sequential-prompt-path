// One-shot 30-day audit: classify every email's CTA as no_url / direct / tracked.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { extractUrls, isTrackedUrl } from "../_shared/ctaTracker.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const window_end = new Date();
  const window_start = new Date(window_end.getTime() - 30 * 86400 * 1000);

  const { data: rows, error } = await sb
    .from("contractor_outreach_logs")
    .select("id, template_key, message_body, sent_at")
    .eq("channel", "email")
    .gte("sent_at", window_start.toISOString())
    .order("sent_at", { ascending: false })
    .limit(5000);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }

  type Bucket = { total: number; no_url: number; direct: number; tracked: number; sample: string[] };
  const groups = new Map<string, Bucket>();
  for (const r of rows ?? []) {
    const key = r.template_key ?? "unknown";
    if (!groups.has(key)) groups.set(key, { total: 0, no_url: 0, direct: 0, tracked: 0, sample: [] });
    const g = groups.get(key)!;
    g.total++;
    const urls = extractUrls(r.message_body ?? "");
    if (urls.length === 0) { g.no_url++; if (g.sample.length < 5) g.sample.push(r.id); }
    else if (urls.some(isTrackedUrl)) g.tracked++;
    else { g.direct++; if (g.sample.length < 5) g.sample.push(r.id); }
  }

  // Wipe old findings for this window and insert fresh
  await sb.from("email_cta_audit_findings").delete().gte("ran_at", new Date(Date.now() - 60_000).toISOString());

  const findings = Array.from(groups.entries()).map(([template_key, g]) => {
    const root =
      g.no_url > 0 ? "Templates without any URL — send must be blocked."
      : g.direct > 0 && g.tracked === 0 ? "All URLs bypass /r/ tracker — attribution impossible."
      : g.direct > 0 ? "Mixed: some emails skip the tracker."
      : "OK";
    return {
      window_start: window_start.toISOString(),
      window_end: window_end.toISOString(),
      template_key,
      total_emails: g.total,
      count_no_url: g.no_url,
      count_direct_url: g.direct,
      count_tracked_url: g.tracked,
      sample_message_ids: g.sample,
      root_cause: root,
    };
  });

  if (findings.length > 0) {
    await sb.from("email_cta_audit_findings").insert(findings);
  }

  const totals = (rows ?? []).reduce((acc, r) => {
    const urls = extractUrls(r.message_body ?? "");
    acc.total++;
    if (urls.length === 0) acc.no_url++;
    else if (urls.some(isTrackedUrl)) acc.tracked++;
    else acc.direct++;
    return acc;
  }, { total: 0, no_url: 0, direct: 0, tracked: 0 });

  return new Response(JSON.stringify({ ok: true, window: { start: window_start, end: window_end }, totals, findings }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
