import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeTwilioSignature, isValidTwilioSignature } from "../_shared/twilioSignature.ts";
import { classifyInbound, normalizeE164 } from "../_shared/smsInbound.ts";
import { gsm7Septets, prepareColdOutreachSms, smsSegmentInfo, toGsm7 } from "../_shared/smsEncoding.ts";

const URL_ = "https://example.supabase.co/functions/v1/twilio-inbound";
const TOKEN = "synthetic_test_token_only";
const P = { MessageSid: "SM" + "a".repeat(32), From: "+15145550000", To: "+15145550001", Body: "ARRÊT" };

Deno.test("signature: valid for exact public URL, rejected otherwise", async () => {
  const sig = await computeTwilioSignature(URL_, P, TOKEN);
  assert(await isValidTwilioSignature(URL_, P, sig, TOKEN));
  assert(!(await isValidTwilioSignature(URL_ + "?x=1", P, sig, TOKEN)));
  assert(!(await isValidTwilioSignature(URL_, { ...P, Body: "OUI" }, sig, TOKEN)));
  assert(!(await isValidTwilioSignature(URL_, P, "", TOKEN)));
  assert(!(await isValidTwilioSignature(URL_, P, sig, "")));
});

Deno.test("inbound: STOP keywords and refusals are opt-outs (FR/EN)", () => {
  for (const b of ["STOP", "stop.", "Arrêt", "ARRET", "Unsubscribe", "désabonner", "Non merci", "pas intéressé",
    "Retirez-moi de votre liste", "ne m'écrivez plus", "Not interested", "please remove me", "Non", "Merci pas besoin", "Vous êtes pas tannés d'envoyer ces textos",
    "Ce numéro est réservé aux clients de Plomberie X."]) {
    assertEquals(classifyInbound(b), "stop", b);
  }
  assertEquals(classifyInbound("anything", "STOP"), "stop");
});

Deno.test("inbound: help, auto-reply, question, start", () => {
  assertEquals(classifyInbound("AIDE"), "help");
  assertEquals(classifyInbound("Réponse automatique : je suis absent jusqu'au 2 décembre"), "auto_reply");
  assertEquals(classifyInbound("Out of office until Monday"), "auto_reply");
  for (const b of ["Hey! Thanks for your message, we'll get back to you shortly.", "Jean Tremblay a lu votre message.",
    "Nous avons bien reçu votre demande mais nos bureaux sont présentement fermés.", "Votre message a été reçu par X - Laval"]) {
    assertEquals(classifyInbound(b), "auto_reply", b);
  }
  assertEquals(classifyInbound("C'est combien pour l'inscription?"), "question");
  assertEquals(classifyInbound("START"), "start_request");
  assertEquals(classifyInbound("Oui"), "positive");
});

Deno.test("inbound: E.164 normalization", () => {
  assertEquals(normalizeE164("(514) 555-0000"), "+15145550000");
  assertEquals(normalizeE164("15145550000"), "+15145550000");
  assertEquals(normalizeE164("+15145550000"), "+15145550000");
});

Deno.test("gsm7: exact septets incl. extension chars", () => {
  assertEquals(gsm7Septets("abc"), 3);
  assertEquals(gsm7Septets("é à è ù"), 7);
  assertEquals(gsm7Septets("€[]"), 6);
  assertEquals(gsm7Septets("ê"), null);
  assertEquals(smsSegmentInfo("a".repeat(160)).segments, 1);
  assertEquals(smsSegmentInfo("a".repeat(161)).segments, 2);
  assertEquals(smsSegmentInfo("{".repeat(81)).segments, 2);
  assertEquals(smsSegmentInfo("ê".repeat(70)), { encoding: "UCS-2", units: 70, segments: 1 });
});

Deno.test("gsm7: converts only when needed, keeps GSM accents", () => {
  const same = toGsm7("Bonjour, été à Montréal");
  assertEquals(same.changed, false);
  assertEquals(same.text, "Bonjour, été à Montréal");
  const c = toGsm7("Ça s’arrête — «\u00A0fenêtre\u00A0» 👍 Québec");
  assertEquals(c.gsm7, true);
  assertEquals(c.text, "Ça s'arrete - \" fenetre \" Québec");
});

Deno.test("cold outreach: one segment with identity + STOP, else rejected (no truncation)", () => {
  const ok = prepareColdOutreachSms("Bonjour, ici UNPRO. Votre fiche est prête : unpro.ca/x. Répondez STOP pour ne plus recevoir.");
  assert(ok.ok);
  assertEquals(ok.segments, 1);
  const long = prepareColdOutreachSms("Bonjour, ici UNPRO. " + "x".repeat(150) + " STOP");
  assertEquals(long.ok, false);
  assert(long.issues.includes("exceeds_one_segment"));
  assertEquals(long.send_body.length > 160, true);
  assert(prepareColdOutreachSms("Bonjour, ici UNPRO. unpro.ca").issues.includes("missing_opt_out"));
  assert(prepareColdOutreachSms("Bonjour. Répondez STOP").issues.includes("missing_sender_identity"));
  assert(prepareColdOutreachSms("Bonjour, ici UNPRO 中文 STOP").issues.includes("non_gsm7_char"));
});
