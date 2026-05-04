/**
 * UNPRO — send-otp
 * Custom OTP via Twilio Messaging Service (gateway).
 * Hashes code, stores in otp_codes, rate-limits per phone+IP.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const OTP_TTL_SECONDS = 300;
const PHONE_LIMIT = 3;        // max sends per phone per 10 min
const PHONE_WINDOW_MS = 10 * 60_000;
const IP_LIMIT = 10;          // max sends per IP per hour
const IP_WINDOW_MS = 60 * 60_000;

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

function genCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const MSG_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
    if (!TWILIO_API_KEY) return json({ error: "TWILIO_API_KEY missing" }, 500);
    if (!MSG_SID) return json({ error: "TWILIO_MESSAGING_SERVICE_SID missing" }, 500);

    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body.phone);
    if (!phone) return json({ ok: true }); // generic — never enumerate

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Rate limit (phone & IP) ──
    const now = Date.now();
    for (const [key, scope, limit, windowMs] of [
      [`phone:${phone}`, "phone", PHONE_LIMIT, PHONE_WINDOW_MS],
      [`ip:${ip}`, "ip", IP_LIMIT, IP_WINDOW_MS],
    ] as const) {
      const { data: row } = await sb.from("otp_rate_limits").select("*").eq("key", key).maybeSingle();
      if (row) {
        const age = now - new Date(row.window_start).getTime();
        if (age < windowMs) {
          if (row.count >= limit) return json({ ok: true }); // generic
          await sb.from("otp_rate_limits").update({ count: row.count + 1 }).eq("key", key);
        } else {
          await sb.from("otp_rate_limits").update({ window_start: new Date().toISOString(), count: 1 }).eq("key", key);
        }
      } else {
        await sb.from("otp_rate_limits").insert({ key, scope, count: 1 });
      }
    }

    // ── Invalidate previous unconsumed codes ──
    await sb.from("otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("phone", phone)
      .is("consumed_at", null);

    // ── Generate + store ──
    const code = genCode();
    const code_hash = await sha256(`${phone}:${code}`);
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

    const { error: insErr } = await sb.from("otp_codes")
      .insert({ phone, code_hash, expires_at, ip });
    if (insErr) {
      console.error("otp insert", insErr);
      return json({ ok: true }); // generic
    }

    // ── Send via Twilio Messaging Service ──
    const smsBody = `UNPRO 🔵\nVotre code sécurisé : ${code}\n\nValide 5 minutes.\nNe partagez jamais ce code.`;
    const twRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        MessagingServiceSid: MSG_SID,
        Body: smsBody,
      }),
    });
    const twData = await twRes.json().catch(() => ({}));

    await sb.from("sms_messages").insert({
      message_sid: twData.sid ?? null,
      phone_number: phone,
      direction: "outbound",
      message_body: smsBody.replace(code, "******"),
      status: twRes.ok ? (twData.status || "queued") : "failed",
      provider: "twilio",
      purpose: "otp",
    });

    if (!twRes.ok) {
      console.error("twilio send fail", twRes.status, twData);
      return json({ ok: true }); // generic
    }

    return json({ ok: true });
  } catch (e) {
    console.error("send-otp", e);
    return json({ ok: true });
  }
});
