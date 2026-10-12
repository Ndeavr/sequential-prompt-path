// Inbound voice: forwards calls to the owned Twilio number to the founder's mobile
// (TWILIO_CALL_FORWARD_TO secret). Twilio-signed requests only. No recording/transcription.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildDialTwiml, computeTwilioSignature, EMPTY_TWIML, maskNumber, needsCallback,
  OWNED_TWILIO_NUMBERS, safeEqual, UNAVAILABLE_TWIML,
} from "./logic.ts";

const xml = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/xml" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const dest = (Deno.env.get("TWILIO_CALL_FORWARD_TO") ?? "").trim();
  const u = new URL(req.url);
  const isStatus = u.searchParams.get("stage") === "dial-status";
  // Twilio signs the exact public URL it called.
  const publicUrl = `${SUPABASE_URL}/functions/v1/twilio-voice-inbound${isStatus ? "?stage=dial-status" : ""}`;

  const form = await req.formData();
  const p: Record<string, string> = {};
  for (const [k, v] of form.entries()) p[k] = String(v);

  const sig = req.headers.get("x-twilio-signature") ?? "";
  if (!token || !sig || !safeEqual(await computeTwilioSignature(publicUrl, p, token), sig)) {
    console.warn("twilio-voice-inbound: rejected signature", { hasToken: !!token, hasSig: !!sig });
    return new Response("Forbidden", { status: 403 });
  }

  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const callSid = p.CallSid ?? "";
  if (!callSid) return xml(EMPTY_TWIML, 400);

  if (isStatus) {
    const status = p.DialCallStatus ?? "unknown";
    const cb = needsCallback(status);
    await sb.from("inbound_call_logs").update({
      dial_status: status,
      dial_duration_s: p.DialCallDuration ? Number(p.DialCallDuration) : null,
      needs_callback: cb,
      updated_at: new Date().toISOString(),
    }).eq("call_sid", callSid);
    console.log("twilio-voice-inbound: dial result", { callSid, status });
    return xml(cb ? UNAVAILABLE_TWIML : EMPTY_TWIML);
  }

  const from = p.From ?? "";
  const to = p.To ?? "";
  const callerId = OWNED_TWILIO_NUMBERS.includes(to) ? to : OWNED_TWILIO_NUMBERS[0];
  const twiml = buildDialTwiml(dest, callerId, publicUrl + "?stage=dial-status");

  // Prospect association: only when exactly one lead matches.
  let matchedId: string | null = null;
  let matchCount = 0;
  const tail = from.replace(/\D/g, "").slice(-10);
  if (tail.length === 10) {
    const { data } = await sb.from("contractor_leads").select("id")
      .or(`phone.ilike.%${tail},mobile_phone.ilike.%${tail}`).limit(3);
    matchCount = data?.length ?? 0;
    if (matchCount === 1) matchedId = data![0].id;
  }

  // Idempotent on CallSid (Twilio retries).
  await sb.from("inbound_call_logs").upsert({
    call_sid: callSid,
    from_number: from,
    to_number: to,
    destination_masked: twiml ? maskNumber(dest) : null,
    dial_status: twiml ? "dialing" : "misconfigured",
    matched_prospect_count: matchCount,
    matched_prospect_id: matchedId,
    needs_callback: !twiml,
  }, { onConflict: "call_sid", ignoreDuplicates: true });

  if (!twiml) {
    console.error("twilio-voice-inbound: forward destination missing/invalid/loop");
    return xml(UNAVAILABLE_TWIML);
  }
  console.log("twilio-voice-inbound: forwarding", { callSid, dest: maskNumber(dest), matchCount });
  return xml(twiml);
});
