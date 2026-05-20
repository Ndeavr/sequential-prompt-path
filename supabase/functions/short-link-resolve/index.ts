// Resolves a short link slug → target path + tracks click.
// Public endpoint. No JWT required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")?.trim();
    if (!slug) {
      return new Response(JSON.stringify({ error: "missing slug" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: link } = await supabase
      .from("short_links")
      .select("slug, target_path, prospect_page_id")
      .eq("slug", slug)
      .maybeSingle();

    // Fallback: if no short_link row, assume slug = prospect_pages.slug
    let target = link?.target_path;
    if (!target) {
      const { data: p } = await supabase
        .from("prospect_pages")
        .select("slug")
        .eq("slug", slug)
        .maybeSingle();
      if (p) target = `/pro/${p.slug}`;
    }

    if (!target) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Track click (best-effort)
    const ua = req.headers.get("user-agent") ?? null;
    const ref = req.headers.get("referer") ?? null;
    const ipHeader = req.headers.get("x-forwarded-for") ?? "";
    const ipHash = ipHeader
      ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ipHeader)).then(b =>
          Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 32))
      : null;

    await supabase.from("short_link_clicks").insert({
      slug, user_agent: ua, referrer: ref, ip_hash: ipHash,
    });

    // bump counter
    await supabase.rpc("increment_short_link_click", { p_slug: slug }).then(() => {}).catch(async () => {
      // fallback if rpc not present
      const { data: cur } = await supabase.from("short_links").select("click_count").eq("slug", slug).maybeSingle();
      await supabase.from("short_links").update({
        click_count: (cur?.click_count ?? 0) + 1,
        last_clicked_at: new Date().toISOString(),
      }).eq("slug", slug);
    });

    // Mark sms_campaigns clicked if not yet
    await supabase
      .from("sms_campaigns")
      .update({ clicked_at: new Date().toISOString(), conversion_status: "clicked" })
      .eq("short_link", slug)
      .is("clicked_at", null);

    return new Response(JSON.stringify({ target }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
