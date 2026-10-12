import { describe, it, expect } from "vitest";
import {
  buildDialTwiml, computeTwilioSignature, maskNumber, needsCallback, safeEqual, isE164,
} from "../../supabase/functions/twilio-voice-inbound/logic";

const DEST = "+15142499522";
describe("twilio-voice-inbound", () => {
  it("builds Dial TwiML to destination with owned callerId", () => {
    const x = buildDialTwiml(DEST, "+14503286776", "https://x/fn?stage=dial-status")!;
    expect(x).toContain(`<Number>${DEST}</Number>`);
    expect(x).toContain('timeout="25"');
    expect(x).toContain('callerId="+14503286776"');
    expect(x).not.toMatch(/Record|Transcri/);
  });
  it("refuses loops and invalid destinations", () => {
    expect(buildDialTwiml("+14503286776", "+14503286776", "u")).toBeNull();
    expect(buildDialTwiml("+15745405938", "+14503286776", "u")).toBeNull();
    expect(buildDialTwiml("514249", "+14503286776", "u")).toBeNull();
    expect(isE164(DEST)).toBe(true);
  });
  it("masks destination", () => expect(maskNumber(DEST)).toBe("***-***-9522"));
  it("fallback on no-answer/busy only", () => {
    expect(needsCallback("no-answer")).toBe(true);
    expect(needsCallback("busy")).toBe(true);
    expect(needsCallback("completed")).toBe(false);
  });
  it("signature: valid accepted, tampered rejected", async () => {
    const url = "https://e.co/functions/v1/twilio-voice-inbound";
    const params = { CallSid: "CA1", From: "+15145550000", To: "+14503286776" };
    const good = await computeTwilioSignature(url, params, "tok");
    expect(safeEqual(await computeTwilioSignature(url, params, "tok"), good)).toBe(true);
    expect(safeEqual(await computeTwilioSignature(url, { ...params, From: "+1" }, "tok"), good)).toBe(false);
    expect(safeEqual(await computeTwilioSignature(url, params, "bad"), good)).toBe(false);
  });
});
