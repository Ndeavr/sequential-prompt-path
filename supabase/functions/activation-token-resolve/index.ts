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
    const trackEvent = String((body as { event?: string })?.event ?? "").trim();
    if (!token || token.length > 128) {
      return json({ ok: false, reason: "invalid_token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Lightweight tracking mode: record an intermediate funnel step (e.g. the
    // "Activer mon profil" tap) without re-resolving or re-counting the click.
    if (trackEvent) {
      const allowed = new Set(["checkout_cta_clicked", "checkout_cta_failed"]);
      if (!allowed.has(trackEvent)) return json({ ok: false, reason: "unsupported_event" }, 400);
      try {
        const { data: tk } = await supabase
          .from("verified_prospect_tokens")
          .select("prospect_id")
          .eq("token", token)
          .maybeSingle();
        await supabase.rpc("record_engagement_event", {
          _event_type: trackEvent,
          _channel: "web",
          _status: trackEvent,
          _provider: "unpro",
          _tracking_id: token,
          _prospect_id: tk?.prospect_id ?? null,
          _source_table: "verified_prospect_tokens",
          _source_row_id: token,
          _metadata: { surface: "unpro_activate" },
          _idempotency_key: `${trackEvent}:${token}:${Math.floor(Date.now() / 60000)}`,
        });
      } catch (e) {
        console.error("[activation-token-resolve] track_failed", e);
      }
      return json({ ok: true, tracked: trackEvent });
    }



    const { data: row, error } = await supabase
      .from("verified_prospect_tokens")
      .select("token, prospect_id, created_at, clicked_at, click_count, campaign_id")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("[activation-token-resolve] token_lookup_failed", error.message);
      return json({ ok: false, reason: "lookup_failed" }, 500);
    }

    // Messaging apps sometimes truncate the link. Fall back to a prefix match
    // when the prefix is long enough to be unambiguous AND resolves to exactly
    // one token.
    let resolved = row;
    if (!resolved && token.length >= 10) {
      const { data: candidates, error: prefixError } = await supabase
        .from("verified_prospect_tokens")
        .select("token, prospect_id, created_at, clicked_at, click_count, campaign_id")
        .like("token", `${token}%`)
        .limit(2);

      if (prefixError) {
        console.error("[activation-token-resolve] prefix_lookup_failed", prefixError.message);
      } else if (candidates && candidates.length === 1) {
        resolved = candidates[0];
        console.log("[activation-token-resolve] resolved_by_prefix", token);
      } else if (candidates && candidates.length > 1) {
        console.warn("[activation-token-resolve] ambiguous_prefix", token);
        return json({ ok: false, reason: "token_ambiguous" }, 404);
      }
    }

    if (!resolved) {
      console.warn("[activation-token-resolve] token_not_found", token);
      return json({ ok: false, reason: "token_not_found" }, 404);
    }


    const { data: prospect } = await supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, legal_name, city, category, email, website_url, phone_e164")
      .eq("id", resolved.prospect_id)
      .maybeSingle();

    if (!prospect) return json({ ok: false, reason: "prospect_not_found" }, 404);

    // Record the click (best-effort — never block the page render).
    const now = new Date().toISOString();
    const realToken = resolved.token;
    try {
      await supabase
        .from("verified_prospect_tokens")
        .update({
          clicked_at: resolved.clicked_at ?? now,
          click_count: (resolved.click_count ?? 0) + 1,
        })
        .eq("token", realToken);

      await supabase
        .from("verified_contractor_prospects")
        .update({ outreach_clicked_at: now, last_action_at: now })
        .eq("id", prospect.id);

      // Canonical funnel events: click + landing view (idempotent per token).
      await supabase.rpc("record_engagement_event", {
        _event_type: "clicked",
        _channel: "sms",
        _status: "clicked",
        _provider: "unpro",
        _tracking_id: realToken,
        _prospect_id: prospect.id,
        _destination_url: `/unpro/activate/${realToken}`,
        _source_table: "verified_prospect_tokens",
        _source_row_id: realToken,
        _metadata: { campaign_id: resolved.campaign_id ?? null },
        _idempotency_key: `click:${realToken}`,
      });
      await supabase.rpc("record_engagement_event", {
        _event_type: "landing_viewed",
        _channel: "web",
        _status: "landing_viewed",
        _provider: "unpro",
        _tracking_id: realToken,
        _prospect_id: prospect.id,
        _destination_url: `/unpro/activate/${realToken}`,
        _metadata: { campaign_id: resolved.campaign_id ?? null },
        _idempotency_key: `landing:${realToken}`,
      });
    } catch (e) {
      console.error("[activation-token-resolve] click_track_failed", String(e));
    }

    return json({
      ok: true,
      token: resolved.token,
      campaign_id: resolved.campaign_id ?? null,
      first_click: !resolved.clicked_at,
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
