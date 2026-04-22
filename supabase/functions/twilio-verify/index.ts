/**
 * UNPRO — Twilio Verify OTP Edge Function
 * Actions: send-otp, verify-otp
 * Creates/signs-in Supabase user on successful verification.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ACCOUNT_SID || !AUTH_TOKEN || !VERIFY_SID) {
      return json({ error: "Twilio credentials not configured" }, 500);
    }

    const { action, phone, code } = await req.json();

    if (!phone || typeof phone !== "string" || !/^\+1\d{10}$/.test(phone)) {
      return json({ error: "Invalid phone number. Use E.164 format (+1XXXXXXXXXX)" }, 400);
    }

    const twilioAuth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);
    const baseUrl = `https://verify.twilio.com/v2/Services/${VERIFY_SID}`;

    // ── SEND OTP ──
    if (action === "send-otp") {
      const res = await fetch(`${baseUrl}/Verifications`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Channel: "sms",
          Locale: "fr",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Twilio send error:", JSON.stringify(data));
        const isSmsDisabled = (data.message || "").includes("Delivery channel disabled");
        const isServiceError = res.status >= 500;
        if (isSmsDisabled || isServiceError) {
          return json({
            error: isSmsDisabled
              ? "Le service SMS est temporairement indisponible. Veuillez réessayer plus tard ou utiliser un autre moyen de connexion."
              : "Service de vérification indisponible.",
            fallback: true,
            code: isSmsDisabled ? "SMS_DISABLED" : "SERVICE_UNAVAILABLE",
          }, 200);
        }
        return json({ error: data.message || "Failed to send verification", fallback: false }, res.status);
      }

      return json({ success: true, status: data.status });
    }

    // ── VERIFY OTP ──
    if (action === "verify-otp") {
      if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return json({ error: "Invalid code. Must be 6 digits." }, 400);
      }

      const res = await fetch(`${baseUrl}/VerificationChecks`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Code: code,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "approved") {
        console.error("Twilio verify error:", JSON.stringify(data));
        return json({ error: "Code invalide ou expiré" }, 401);
      }

      // Code verified — create or sign in Supabase user
      const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Check if user exists by phone
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.phone === phone);

      let userId: string;
      let isNewUser = false;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone,
          phone_confirm: true,
        });
        if (createError || !newUser.user) {
          console.error("Create user error:", createError);
          return json({ error: "Failed to create account" }, 500);
        }
        userId = newUser.user.id;
        isNewUser = true;

        // Create profile
        await supabaseAdmin.from("profiles").upsert({
          user_id: userId,
          phone,
        }, { onConflict: "user_id" });
      }

      // Generate session token for the user
      const { data: sessionData, error: sessionError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: `phone_${phone.replace("+", "")}@unpro.internal`,
        });

      // Use a different approach - generate a custom token
      // We'll use signInWithPassword with a generated password approach
      // Actually, the cleanest way: use admin to update user and create session

      // Generate a magic link token and extract the session
      // Better approach: use the Supabase admin to create a session directly
      const { data: signInData, error: signInError } =
        // @ts-ignore - admin method
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: existingUser?.email || `phone-${phone.replace("+", "")}@phone.unpro.ca`,
        });

      // The cleanest pattern: generate a short-lived access token
      // Supabase doesn't have admin.createSession, so we'll use a workaround
      // We set a temp password, sign in, then remove it

      const tempPassword = crypto.randomUUID();

      // Update user with temp password
      await supabaseAdmin.auth.admin.updateUser(userId, {
        password: tempPassword,
        email: existingUser?.email || `phone-${phone.replace("+", "")}@phone.unpro.ca`,
        email_confirm: true,
      });

      // Sign in to get session tokens
      const loginClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: loginData, error: loginError } =
        await loginClient.auth.signInWithPassword({
          email: existingUser?.email || `phone-${phone.replace("+", "")}@phone.unpro.ca`,
          password: tempPassword,
        });

      if (loginError || !loginData.session) {
        console.error("Login error:", loginError);
        return json({ error: "Failed to create session" }, 500);
      }

      // Clear the temp password (set a new random one so it can't be reused)
      await supabaseAdmin.auth.admin.updateUser(userId, {
        password: crypto.randomUUID(),
      });

      // Check if user has roles
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      return json({
        success: true,
        isNewUser,
        needsRole: !roles || roles.length === 0,
        session: {
          access_token: loginData.session.access_token,
          refresh_token: loginData.session.refresh_token,
          expires_in: loginData.session.expires_in,
          token_type: loginData.session.token_type,
          user: loginData.session.user,
        },
      });
    }

    return json({ error: "Invalid action. Use send-otp or verify-otp." }, 400);
  } catch (err) {
    console.error("twilio-verify error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
