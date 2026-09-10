// Edge Function: calendar-google-oauth-start
// Builds the Google OAuth consent URL with state token tied to the user.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { createCalendarOAuthState } from "../_shared/calendarOAuthState.ts";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    if (!clientId) return json({ error: "GOOGLE_OAUTH_CLIENT_ID not configured" }, 500);
    const stateSecret =
      Deno.env.get("CALENDAR_OAUTH_STATE_SECRET") || Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    if (!stateSecret) return json({ error: "Calendar OAuth state secret not configured" }, 500);

    const projectRef = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/([^.]+)/)?.[1];
    const redirectUri = `https://${projectRef}.supabase.co/functions/v1/calendar-google-oauth-callback`;

    const url = new URL(req.url);
    const state = await createCalendarOAuthState(
      user.id,
      url.searchParams.get("return_to"),
      stateSecret,
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "openid",
        "email",
        "profile",
      ].join(" "),
      state,
    });

    return json({ auth_url: `${GOOGLE_AUTH_URL}?${params.toString()}` }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
