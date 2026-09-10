// Edge Function: calendar-google-oauth-callback
// Handles Google's redirect, exchanges code -> tokens, persists encrypted, redirects user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  calendarAppOrigin,
  encryptCalendarToken,
  verifyCalendarOAuthState,
} from "../_shared/calendarOAuthState.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // OAuth callbacks cannot rely on Origin/Referer: browsers and Google may omit
  // them or supply Google's own origin. Use the configured application origin.
  const baseRedirect = calendarAppOrigin(
    Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("APP_URL") || Deno.env.get("SITE_URL"),
  );
  const failure = (reason: string) =>
    Response.redirect(`${baseRedirect}/calendar/connect/failure?reason=${encodeURIComponent(reason)}`, 302);

  if (errorParam || !code || !state) {
    return failure(errorParam ?? "missing_code");
  }

  try {
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
    if (!clientId || !clientSecret) return failure("server");
    const stateSecret = Deno.env.get("CALENDAR_OAUTH_STATE_SECRET") || clientSecret;
    const verifiedState = await verifyCalendarOAuthState(state, stateSecret);
    if (!verifiedState) return failure("invalid_state");

    const tokenEncryptionSecret = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY") || clientSecret;
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
    const tokenJson = await tokenRes.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
    };
    if (!tokenRes.ok) {
      console.error("Google token exchange failed", {
        status: tokenRes.status,
        error: tokenJson.error ?? "unknown",
      });
      return failure("token_exchange");
    }
    if (!tokenJson.access_token) return failure("token_exchange");

    // Userinfo
    const uiRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!uiRes.ok) return failure("userinfo");
    const userinfo = await uiRes.json() as { id?: string; email?: string; name?: string };

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000).toISOString();
    const { data: existingConnection } = await supabaseAdmin
      .from("calendar_connections")
      .select("refresh_token_encrypted")
      .eq("user_id", verifiedState.user_id)
      .eq("provider", "google")
      .maybeSingle();
    const encryptedAccessToken = await encryptCalendarToken(
      tokenJson.access_token,
      tokenEncryptionSecret,
    );
    const encryptedRefreshToken = tokenJson.refresh_token
      ? await encryptCalendarToken(tokenJson.refresh_token, tokenEncryptionSecret)
      : existingConnection?.refresh_token_encrypted ?? null;

    const { error: connectionError } = await supabaseAdmin
      .from("calendar_connections")
      .upsert(
        {
          user_id: verifiedState.user_id,
          provider: "google",
          provider_account_email: userinfo.email ?? null,
          connection_status: "connected",
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
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
    if (connectionError) {
      console.error("calendar connection persistence failed", {
        code: connectionError.code ?? null,
      });
      return failure("persistence");
    }

    await supabaseAdmin.from("calendar_conversion_events").insert({
      user_id: verifiedState.user_id,
      role_context: "unknown",
      surface: "oauth_callback",
      provider: "google",
      event_type: "oauth_succeeded",
      metadata: { email: userinfo.email },
    });

    const target = new URL(verifiedState.return_to, baseRedirect);
    target.searchParams.set("provider", "google");
    return Response.redirect(target.toString(), 302);
  } catch (e) {
    console.error("oauth callback error", e);
    return failure("server");
  }
});
