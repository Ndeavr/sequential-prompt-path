// Public click tracker. GET /sms-sprint-track?s=<slug>
// Logs the click event and 302-redirects to /activer/:slug.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PUBLIC_BASE = Deno.env.get("PUBLIC_APP_URL") ?? "https://unpro.ca";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("s") ?? "";
  const target = `${PUBLIC_BASE}/activer/${slug}?c=1`;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (slug) {
      const { data: sp } = await supabase
        .from("sms_sprint_prospects").select("id").eq("tracking_slug", slug).maybeSingle();
      await supabase.from("sms_sprint_link_events").insert({
        tracking_slug: slug,
        sprint_prospect_id: sp?.id ?? null,
        event: "click",
        meta: { ua: req.headers.get("user-agent") ?? null },
      });
      // Test run click
      const { data: tr } = await supabase
        .from("sms_sprint_test_runs").select("id, link_clicked_at").eq("tracking_slug", slug).maybeSingle();
      if (tr && !tr.link_clicked_at) {
        await supabase.from("sms_sprint_test_runs")
          .update({ link_clicked_at: new Date().toISOString() }).eq("id", tr.id);
      }
    }
  } catch (_) { /* never block redirect */ }
  return new Response(null, { status: 302, headers: { Location: target } });
});
