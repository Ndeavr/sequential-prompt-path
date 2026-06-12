// Edge function: auth-otp-dispatch
// Sends a passwordless magic link by email (Supabase auth), with rate limiting.
// SMS channel is acknowledged but not yet wired (returns sms_unavailable).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT = 3; // attempts
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => null);
    const channel = String(body?.channel ?? "").toLowerCase();
    const identifierRaw = String(body?.identifier ?? "").trim();
    const role = body?.role ? String(body.role) : null;
    const returnUrl = body?.returnUrl ? String(body.returnUrl) : null;

    if (!identifierRaw) return ok({ ok: false, error: "missing_identifier" }, 400);
    if (channel !== "email" && channel !== "sms")
      return ok({ ok: false, error: "invalid_channel" }, 400);

    // Soft normalization (server-side double-safety; client already normalizes).
    const identifier =
      channel === "email" ? identifierRaw.toLowerCase() : identifierRaw.replace(/\s+/g, "");

    // Rate limit per identifier (last 10 min).
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count, error: countErr } = await admin
      .from("auth_otp_attempts")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .gte("created_at", since);

    if (countErr) {
      console.error("[auth-otp-dispatch] count error", countErr);
    } else if ((count ?? 0) >= RATE_LIMIT) {
      // UX-safe: tell user calmly to retry later. No technical leak.
      return ok({ ok: false, error: "rate_limited", retry_after_minutes: 10 });
    }

    if (channel === "sms") {
      // Phone provider not yet enabled on this project. Acknowledge and pivot to email.
      return ok({ ok: false, error: "sms_unavailable" });
    }

    // EMAIL — Supabase passwordless / magic link.
    // Auto-creates the user on first use. Branded email goes through
    // the existing auth-email-hook + email_domain pipeline.
    const emailRedirectTo = returnUrl ?? new URL(req.headers.get("origin") ?? supabaseUrl).origin;

    const { error: otpErr } = await admin.auth.signInWithOtp({
      email: identifier,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
        data: role ? { intended_role: role } : undefined,
      },
    });

    if (otpErr) {
      console.error("[auth-otp-dispatch] signInWithOtp error", otpErr);
      // Never leak the underlying message to the UI.
      return ok({ ok: false, error: "send_failed" });
    }

    // Log the attempt (best-effort, non-blocking).
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await admin
      .from("auth_otp_attempts")
      .insert({ identifier, channel, ip, user_agent: ua })
      .then(({ error }) => {
        if (error) console.error("[auth-otp-dispatch] insert attempt error", error);
      });

    // Mask the identifier for UI confirmation copy.
    const [local, domain] = identifier.split("@");
    const masked = local && domain
      ? `${local.slice(0, 2)}***@${domain}`
      : identifier;

    return ok({ ok: true, channel, masked_identifier: masked });
  } catch (err) {
    console.error("[auth-otp-dispatch] unexpected", err);
    return ok({ ok: false, error: "unexpected" }, 500);
  }
});
