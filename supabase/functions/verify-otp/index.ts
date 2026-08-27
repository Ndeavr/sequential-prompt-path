/**
 * UNPRO — verify-otp
 * Validates hashed OTP, creates/links Supabase user, mints session.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && /^\+\d{10,15}$/.test(raw)) return raw;
  return null;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function syntheticEmail(phone: string) {
  return `phone-${phone.replace("+", "")}@phone.unpro.ca`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { phone: rawPhone, code } = await req.json();
    const phone = normalizePhone(rawPhone);
    if (!phone || !/^\d{6}$/.test(String(code || ""))) {
      return json({ error: "invalid_input" }, 400);
    }

    console.log("otp_verify_started", { phone_suffix: phone.slice(-4) });

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Latest valid unconsumed OTP
    const { data: row } = await sb.from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return json({ error: "expired_or_invalid" }, 401);
    if (row.attempts >= MAX_ATTEMPTS) return json({ error: "too_many_attempts" }, 429);

    const expected = await sha256(`${phone}:${code}`);
    if (expected !== row.code_hash) {
      await sb.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return json({ error: "invalid_code" }, 401);
    }

    console.log("otp_verified", { phone_suffix: phone.slice(-4) });

    await sb.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    // Locate or create user by phone (Supabase stores phone without '+')
    const phoneDigits = phone.replace(/\D/g, "");
    const synthEmail = syntheticEmail(phone);
    const { data: list } = await sb.auth.admin.listUsers();
    let user = list?.users?.find(
      (u) =>
        (u.phone || "").replace(/\D/g, "") === phoneDigits ||
        u.email === synthEmail,
    );
    let isNewUser = false;

    if (!user) {
      const { data: created, error: cErr } = await sb.auth.admin.createUser({
        phone, phone_confirm: true, email: synthEmail, email_confirm: true,
      });
      if (cErr || !created?.user) {
        // Recover if email/phone already exists (race or stored-without-plus)
        const { data: list2 } = await sb.auth.admin.listUsers();
        user = list2?.users?.find(
          (u) =>
            (u.phone || "").replace(/\D/g, "") === phoneDigits ||
            u.email === synthEmail,
        );
        if (!user) {
          console.error("createUser", cErr);
          return json({ error: "account_failed" }, 500);
        }
      } else {
        user = created.user;
        isNewUser = true;
      }
    }

    // Upsert profile
    await sb.from("profiles").upsert({
      user_id: user.id,
      phone,
      onboarding_status: isNewUser ? "phone_verified" : undefined,
    }, { onConflict: "user_id" });

    console.log("auth_user_resolved", { user_id: user.id, is_new: isNewUser });

    // Mint a REAL Supabase session via magic-link token exchange.
    // Never mutate the password here: a password update revokes the freshly
    // minted session (GoTrue invalidates sessions on credential change),
    // which produced "Session not found" on the client.
    const email = user.email || syntheticEmail(phone);
    if (!user.email || !user.email_confirmed_at) {
      await sb.auth.admin.updateUserById(user.id, { email, email_confirm: true });
    }

    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = (linkData as any)?.properties?.hashed_token;
    if (linkErr || !tokenHash) {
      console.error("session_mint_link_failed", linkErr?.message);
      return json({ error: "session_failed" }, 500);
    }

    const loginClient = createClient(SUPABASE_URL, ANON, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: login, error: lErr } = await loginClient.auth.verifyOtp({
      type: "email",
      token_hash: tokenHash,
    });

    if (lErr || !login?.session?.access_token || !login?.session?.refresh_token) {
      console.error("session_mint_verify_failed", lErr?.message);
      return json({ error: "session_failed" }, 500);
    }
    console.log("session_created", { user_id: user.id });


    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id);

    return json({
      ok: true,
      isNewUser,
      needsRole: !roles || roles.length === 0,
      session: {
        access_token: login.session.access_token,
        refresh_token: login.session.refresh_token,
        expires_in: login.session.expires_in,
        token_type: login.session.token_type,
        user: login.session.user,
      },
    });
  } catch (e) {
    console.error("verify-otp", e);
    return json({ error: "server_error" }, 500);
  }
});
