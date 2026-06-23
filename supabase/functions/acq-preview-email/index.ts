// Pre-send email preview: runs the same wrap + validate pipeline.
import { wrapAllUrls, validateCta } from "../_shared/ctaTracker.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { subject, body, prospect_id, contractor_id, campaign, dry_run = true } = await req.json();
    if (!body) {
      return new Response(JSON.stringify({ ok: false, error: "body required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let wrapped = { body, cta_urls: [] as string[], has_tracked_cta: false };
    if (!dry_run) {
      wrapped = await wrapAllUrls(body, { prospect_id, contractor_id, campaign, channel: "email" });
    } else {
      // dry preview: just classify
      const v = validateCta(body);
      wrapped = { body, cta_urls: v.cta_urls, has_tracked_cta: v.has_tracked_cta };
    }
    const v = validateCta(wrapped.body);

    return new Response(JSON.stringify({
      ok: v.ok,
      blocked_reason: v.reason ?? null,
      subject,
      body: wrapped.body,
      html: wrapped.body.replace(/\n/g, "<br/>"),
      cta_urls: wrapped.cta_urls,
      has_tracked_cta: wrapped.has_tracked_cta,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
