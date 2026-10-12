import { describe, it, expect } from "vitest";
import {
  reliableFirstName, chooseMedia, GENERIC_MEDIA_PATH, mmsDispatchDecision, verifyMediaUrl,
  classifyMmsFailure, mmsBody, voiceScript,
} from "../../supabase/functions/_shared/mmsVoice";

const okPre = { senderMmsEnabled: true, country: "CA", caslReviewed: true, optedOut: false, gateOpen: true, dailyCapRemaining: 5, media: { ok: true as const } };

describe("MMS vocal", () => {
  it("prénom fiable vs suspect", () => {
    expect(reliableFirstName("marc")).toBe("Marc");
    for (const bad of ["", "Info", "Entreprise", "Inconnu", "jean@x.ca", "ABC", "Toitures Pro Plus", "J"])
      expect(reliableFirstName(bad, "Toitures Pro Plus")).toBeNull();
  });
  it("personnalisé seulement si clip en cache, sinon générique", async () => {
    const p = await chooseMedia("Marc", null, async () => true);
    expect(p.kind).toBe("personalized");
    expect(p.path).not.toContain("marc");
    expect((await chooseMedia("Marc", null, async () => false)).path).toBe(GENERIC_MEDIA_PATH);
    expect((await chooseMedia("Info", null, async () => true)).kind).toBe("generic");
  });
  it("script et corps", () => {
    expect(voiceScript(null).startsWith("Salut! Ici Yanick d'un pro point cé-a.")).toBe(true);
    expect(mmsBody("https://unpro.ca/x")).toContain("350 $ : https://unpro.ca/x");
    expect(mmsBody("l")).toContain("STOP");
  });
  it("fail-closed : STOP, CASL, gate, cap, pays, sender, média", () => {
    expect(mmsDispatchDecision(okPre).dispatch).toBe(true);
    expect(mmsDispatchDecision({ ...okPre, optedOut: true }).status).toBe("opted_out");
    expect(mmsDispatchDecision({ ...okPre, caslReviewed: false }).dispatch).toBe(false);
    expect(mmsDispatchDecision({ ...okPre, gateOpen: false }).dispatch).toBe(false);
    expect(mmsDispatchDecision({ ...okPre, dailyCapRemaining: 0 }).dispatch).toBe(false);
    expect(mmsDispatchDecision({ ...okPre, country: "US" }).dispatch).toBe(false);
    expect(mmsDispatchDecision({ ...okPre, senderMmsEnabled: false }).status).toBe("media_not_supported");
    expect(mmsDispatchDecision({ ...okPre, media: { ok: false, reason: "x" } }).status).toBe("fallback_pending_approval");
  });
  it("échec Twilio média → pas de repli SMS", () => {
    expect(classifyMmsFailure(12300)).toBe("fallback_pending_approval");
    expect(classifyMmsFailure(30008)).toBe("mms_failed");
  });
  it("vérification MediaUrl", async () => {
    const mk = (type: string, len: number) => (async (_u: string, i?: RequestInit) =>
      i?.method === "HEAD"
        ? new Response(null, { status: 200, headers: { "content-type": type, "content-length": String(len) } })
        : new Response(new Uint8Array(len))) as unknown as typeof fetch;
    expect((await verifyMediaUrl("https://h/a.mp3", mk("audio/mpeg", 55710))).ok).toBe(true);
    expect((await verifyMediaUrl("https://h/a.mp3", mk("application/octet-stream", 55710))).ok).toBe(false);
    expect((await verifyMediaUrl("https://h/a.mp3", mk("audio/mpeg", 900000))).ok).toBe(false);
    expect((await verifyMediaUrl("https://resource2.heygen.ai/x.wav", mk("audio/mpeg", 10))).ok).toBe(false);
  });
});
