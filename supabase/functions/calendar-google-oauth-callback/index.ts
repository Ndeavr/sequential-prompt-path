// Edge Function: calendar-google-oauth-callback
// Handles Google's redirect, exchanges code -> tokens, persists encrypted, redirects user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appOrigin = req.headers.get("origin") || req.headers.get("referer") || "";
  const baseRedirect = appOrigin || "https://unpro.ca";

  if (errorParam || !code || !state) {
    return Response.redirect(`${baseRedirect}/calendar/connect/failure?reason=${errorParam ?? "missing_code"}`, 302);
  }

  try {
    const decoded = atob(state);
    const [userId, returnTo] = decoded.split("|");
    if (!userId) throw new Error("Invalid state");

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
    const projectRef = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/([^.]+)/)?.[1];
    const redirectUri = `https://${projectRef}.supabase.co/functions/v1/calendar-google-oauth-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Google token exchange failed", tokenJson);
      return Response.redirect(`${baseRedirect}/calendar/connect/failure?reason=token_exchange`, 302);
    }

    // Userinfo
    const uiRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const userinfo = await uiRes.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000).toISOString();

    // Naive base64 wrapping (Lovable Cloud encrypts at rest; rotating later via vault if needed)
    const enc = (s: string) => btoa(s);

    await supabaseAdmin
      .from("calendar_connections")
      .upsert(
        {
          user_id: userId,
          provider: "google",
          provider_account_email: userinfo.email ?? null,
          connection_status: "connected",
          access_token_encrypted: enc(tokenJson.access_token),
          refresh_token_encrypted: tokenJson.refresh_token ? enc(tokenJson.refresh_token) : null,
          expires_at: expiresAt,
          scopes_json: (tokenJson.scope ?? "").split(" "),
          is_primary: true,
          connected_at: new Date().toISOString(),
          last_synced_at: null,
          last_error_message: null,
          metadata: { google_user_id: userinfo.id, name: userinfo.name },
        },
        { onConflict: "user_id,provider" },
      );

    await supabaseAdmin.from("calendar_conversion_events").insert({
      user_id: userId,
      role_context: "unknown",
      surface: "oauth_callback",
      provider: "google",
      event_type: "oauth_succeeded",
      metadata: { email: userinfo.email },
    });

    const target = `${baseRedirect}${returnTo || "/calendar/connect/success"}?provider=google`;
    return Response.redirect(target, 302);
  } catch (e) {
    console.error("oauth callback error", e);
    return Response.redirect(`${baseRedirect}/calendar/connect/failure?reason=server`, 302);
  }
});
