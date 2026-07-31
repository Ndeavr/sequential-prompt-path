// activation-token-resolve — Public resolver for /unpro/activate/:token
// Resolves an outreach activation token to its verified contractor prospect and
// records the click (token + prospect), unblocking the "clic" funnel milestone.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String((body as { token?: string })?.token ?? "").trim();
    if (!token || token.length > 128) {
      return json({ ok: false, reason: "invalid_token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error } = await supabase
      .from("verified_prospect_tokens")
      .select("token, prospect_id, created_at, clicked_at, click_count")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("[activation-token-resolve] token_lookup_failed", error.message);
      return json({ ok: false, reason: "lookup_failed" }, 500);
    }
    if (!row) return json({ ok: false, reason: "token_not_found" }, 404);

    const { data: prospect } = await supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, legal_name, city, category, email, website_url, phone_e164")
      .eq("id", row.prospect_id)
      .maybeSingle();

    if (!prospect) return json({ ok: false, reason: "prospect_not_found" }, 404);

    // Record the click (best-effort — never block the page render).
    const now = new Date().toISOString();
    try {
      await supabase
        .from("verified_prospect_tokens")
        .update({
          clicked_at: row.clicked_at ?? now,
          click_count: (row.click_count ?? 0) + 1,
        })
        .eq("token", token);

      await supabase
        .from("verified_contractor_prospects")
        .update({ outreach_clicked_at: now, last_action_at: now })
        .eq("id", prospect.id);
    } catch (e) {
      console.error("[activation-token-resolve] click_track_failed", String(e));
    }

    return json({
      ok: true,
      token,
      first_click: !row.clicked_at,
      prospect: {
        id: prospect.id,
        business_name: prospect.business_name ?? prospect.legal_name ?? null,
        city: prospect.city ?? null,
        category: prospect.category ?? null,
        email: prospect.email ?? null,
        website_url: prospect.website_url ?? null,
      },
    });
  } catch (e) {
    console.error("[activation-token-resolve] fatal", String(e));
    return json({ ok: false, reason: "internal_error" }, 500);
  }
});
