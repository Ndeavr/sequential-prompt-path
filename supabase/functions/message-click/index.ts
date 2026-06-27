// UNPRO — Public click attribution endpoint.
// Accepts /message-click/:trackingId or ?id= and forwards to the canonical r-redirect tracker.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const parts = url.pathname.split("/").filter(Boolean);
    const trackingId = url.searchParams.get("id") || parts[parts.length - 1] || "";
    if (!trackingId || trackingId === "message-click") {
      return Response.redirect(FALLBACK_URL, 302);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const target = `${supabaseUrl}/functions/v1/r-redirect/${encodeURIComponent(trackingId)}`;
    const res = await fetch(target, {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": req.headers.get("user-agent") ?? "",
        "referer": req.headers.get("referer") ?? "",
        "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      },
    });
    return Response.redirect(res.headers.get("location") || FALLBACK_URL, 302);
  } catch (e) {
    console.error("[message-click]", e);
    return Response.redirect(FALLBACK_URL, 302);
  }
});
