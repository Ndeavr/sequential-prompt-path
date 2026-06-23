// UNPRO — Click tracker → logs clicked event, 302 redirects.
// Route public URL: https://unpro.ca/r/:trackingId  (mapped via SPA + this fn for tracking).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const FALLBACK_URL = "https://unpro.ca";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = new URL(req.url);
    // Extract tracking id: last path segment OR ?id=
    const parts = url.pathname.split("/").filter(Boolean);
    const trackingId = url.searchParams.get("id") || parts[parts.length - 1] || "";
    if (!trackingId || trackingId === "r-redirect") {
      return Response.redirect(FALLBACK_URL, 302);
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: link } = await supa
      .from("acquisition_tracking_links")
      .select("*")
      .eq("id", trackingId)
      .maybeSingle();

    if (!link) {
      return Response.redirect(FALLBACK_URL, 302);
    }

    // Update click counters
    const now = new Date().toISOString();
    await supa.from("acquisition_tracking_links").update({
      click_count: (link.click_count ?? 0) + 1,
      first_click_at: link.first_click_at ?? now,
      last_click_at: now,
    }).eq("id", trackingId);

    await logAcquisitionEvent({
      prospect_id: link.prospect_id,
      contractor_id: link.contractor_id,
      profile_id: link.profile_id,
      tracking_id: trackingId,
      channel: (link.channel as any) || "web",
      event_type: "clicked",
      provider: "app",
      provider_event_id: `${trackingId}:${now}`,
      metadata: {
        user_agent: req.headers.get("user-agent"),
        referer: req.headers.get("referer"),
        campaign: link.campaign,
      },
    });

    return Response.redirect(link.destination_url || FALLBACK_URL, 302);
  } catch (err) {
    console.error("[r-redirect]", err);
    return Response.redirect(FALLBACK_URL, 302);
  }
});
