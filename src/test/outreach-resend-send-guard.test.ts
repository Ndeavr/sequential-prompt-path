import { describe, expect, it } from "vitest";
import { handleSend, resolveDomainProof, type Deps } from "../../supabase/functions/outreach-resend-send/handler";

const SRK = "service-role-synthetic";
const html = '<html><body><p>Activation 350 $ + taxes</p><a href="https://unpro.ca/r/x">Activer</a></body></html>';
const input = { to: "info@example-synthetic.ca", subject: "Activer votre profil", html, campaign: "c1" };

function deps(over: Partial<Deps> = {}) {
  const claims = new Map<string, { status: string; attempts: number }>();
  const sent: Record<string, unknown>[] = [];
  const keys: (string | null)[] = [];
  const d: Deps = {
    serviceRoleKey: SRK, founderEmail: "danny@unpro.ca", postalAddress: "ADRESSE-SYNTHETIQUE",
    unsubscribeBaseUrl: "https://unpro.ca/unsubscribe", senderFrom: "Clara <clara@mail.unpro.ca>", senderDomain: "mail.unpro.ca",
    hasProviderKey: true,
    outreachEnabled: async () => true,
    autopilotOpen: async () => ({ allowed: true, reason: null }),
    senderDomainVerified: async () => "verified" as const,
    isSuppressed: async () => false,
    hasReviewedEmailConsent: async () => true,
    createUnsubscribeToken: async () => "tok0123456789abcdef",
    sha256: async (s) => s,
    claim: async (key) => {
      await Promise.resolve();
      const c = claims.get(key);
      if (!c) { claims.set(key, { status: "sending", attempts: 1 }); return "claimed"; }
      if (c.status === "sent") return "duplicate_sent";
      if (c.status === "sending") return "duplicate_in_flight";
      if (c.status === "failed_final" || c.attempts >= 3) return "retry_exhausted";
      c.status = "sending"; c.attempts++; return "claimed_retry";
    },
    settle: async (key, status) => { claims.get(key)!.status = status; },
    providerSend: async (p, k) => { sent.push(p); keys.push(k); return { status: 200, body: { id: "re_synthetic" } }; },
    log: async () => {},
    ...over,
  };
  return { d, sent, claims, keys };
}

describe("outreach-resend-send fail-closed guard", () => {
  it("anonymous or anon-key POST is 401 and never reaches the provider", async () => {
    const { d, sent } = deps();
    expect((await handleSend(null, input, d)).status).toBe(401);
    expect((await handleSend("Bearer anon-key", input, d)).status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it.each([
    ["OUTREACH_DISABLED", { outreachEnabled: async () => false }],
    ["AUTOPILOT_GATED", { autopilotOpen: async () => ({ allowed: false, reason: "operational_score_below_95" }) }],
    ["SENDER_DOMAIN_NOT_VERIFIED", { senderDomainVerified: async () => "unverified" as const }],
    ["SENDER_DOMAIN_UNKNOWN", { senderDomainVerified: async () => "unknown" as const }],
    ["SENDER_POSTAL_ADDRESS_MISSING", { postalAddress: "" }],
    ["RECIPIENT_SUPPRESSED", { isSuppressed: async () => true }],
    ["RECIPIENT_SUPPRESSED", { isSuppressed: async () => { throw new Error("db"); } }],
    ["NO_REVIEWED_CASL_EVIDENCE", { hasReviewedEmailConsent: async () => false }],
  ] as const)("blocks %s before provider", async (reason, over) => {
    const { d, sent } = deps(over as Partial<Deps>);
    const r = await handleSend(`Bearer ${SRK}`, input, d);
    expect(r.body.reason).toBe(reason);
    expect(sent).toHaveLength(0);
  });

  it("rejects forbidden 1 $ copy", async () => {
    const { d, sent } = deps();
    const r = await handleSend(`Bearer ${SRK}`, { ...input, html: html.replace("350 $", "1 $") }, d);
    expect(r.body.reason).toBe("FORBIDDEN_OFFER_COPY");
    expect(sent).toHaveLength(0);
  });

  it("two simultaneous identical requests produce exactly one provider call", async () => {
    const { d, sent } = deps();
    const [a, b] = await Promise.all([handleSend(`Bearer ${SRK}`, input, d), handleSend(`Bearer ${SRK}`, input, d)]);
    expect(sent).toHaveLength(1);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it("adds postal address, unsubscribe link and List-Unsubscribe header", async () => {
    const { d, sent } = deps();
    await handleSend(`Bearer ${SRK}`, input, d);
    expect(String(sent[0].html)).toContain("ADRESSE-SYNTHETIQUE");
    expect(String(sent[0].html)).toContain("https://unpro.ca/unsubscribe?token=tok0123456789abcdef");
    expect((sent[0].headers as Record<string, string>)["List-Unsubscribe"]).toContain("unsubscribe?token=tok0123456789abcdef");
  });

  it("failed provider: retry allowed at most 3 attempts, then no more sends", async () => {
    const { d, sent } = deps({ providerSend: async (p) => { sent.push(p); return { status: 500, body: { message: "down" } }; } });
    for (let i = 0; i < 5; i++) await handleSend(`Bearer ${SRK}`, input, d);
    expect(sent).toHaveLength(3);
  });

  it("internal test to founder skips commercial gates; internal_test to external is refused", async () => {
    const { d, sent } = deps({ outreachEnabled: async () => false });
    expect((await handleSend(`Bearer ${SRK}`, { ...input, to: "danny@unpro.ca" }, d)).status).toBe(200);
    expect((await handleSend(`Bearer ${SRK}`, { ...input, purpose: "internal_test" }, d)).status).toBe(403);
    expect(sent).toHaveLength(1);
  });

  it("text/plain part also carries postal address and unsubscribe link", async () => {
    const { d, sent } = deps({ postalAddress: "281, rue Saint-Paul, Montréal (Québec) H2Y 1H1, Canada" });
    await handleSend(`Bearer ${SRK}`, { ...input, text: "Version texte fournie" }, d);
    const t = String(sent[0].text);
    expect(t).toContain("Version texte fournie");
    expect(t).toContain("281, rue Saint-Paul, Montréal (Québec) H2Y 1H1, Canada");
    expect(t).toContain("Se désabonner : https://unpro.ca/unsubscribe?token=tok0123456789abcdef");
    expect(String(sent[0].html)).toContain("281, rue Saint-Paul");
  });

  it("invalid unsubscribe token blocks before provider", async () => {
    const { d, sent } = deps({ createUnsubscribeToken: async () => "x" });
    expect((await handleSend(`Bearer ${SRK}`, input, d)).body.reason).toBe("UNSUBSCRIBE_UNAVAILABLE");
    expect(sent).toHaveLength(0);
  });

  it("200 without provider id is never 'sent' and is never auto-resent", async () => {
    const { d, sent, claims } = deps({ providerSend: async (p) => { sent.push(p); return { status: 200, body: {} }; } });
    const r = await handleSend(`Bearer ${SRK}`, input, d);
    expect(r.body.reason).toBe("PROVIDER_STATE_UNKNOWN");
    expect([...claims.values()][0].status).toBe("failed_final");
    await handleSend(`Bearer ${SRK}`, input, d);
    expect(sent).toHaveLength(1);
  });

  it("network error is unknown state, no automatic resend", async () => {
    let calls = 0;
    const { d } = deps({ providerSend: async () => { calls++; throw new Error("timeout"); } });
    await handleSend(`Bearer ${SRK}`, input, d);
    await handleSend(`Bearer ${SRK}`, input, d);
    expect(calls).toBe(1);
  });

  it("provider Idempotency-Key is the stable claim key; retry payload identical", async () => {
    let n = 0; const payloads: string[] = []; const ks: (string | null)[] = [];
    const { d } = deps({ providerSend: async (p, k) => { payloads.push(JSON.stringify(p)); ks.push(k); return n++ === 0 ? { status: 503, body: {} } : { status: 200, body: { id: "re_1" } }; } });
    await handleSend(`Bearer ${SRK}`, input, d);
    await handleSend(`Bearer ${SRK}`, input, d);
    expect(ks).toEqual(["info@example-synthetic.ca|c1", "info@example-synthetic.ca|c1"]);
    expect(payloads[0]).toBe(payloads[1]);
  });
});

describe("sender domain proof", () => {
  const now = Date.parse("2026-10-23T22:00:00Z");
  it("200 with exact verified domain → verified; other domain → unverified", () => {
    expect(resolveDomainProof("mail.unpro.ca", 200, { data: [{ name: "mail.unpro.ca", status: "verified" }] }, "", now)).toBe("verified");
    expect(resolveDomainProof("mail.unpro.ca", 200, { data: [{ name: "other.ca", status: "verified" }] }, "", now)).toBe("unverified");
  });
  it("401 send-only key is unknown, never verified, without approved proof", () => {
    expect(resolveDomainProof("mail.unpro.ca", 401, null, "", now)).toBe("unknown");
    expect(resolveDomainProof("mail.unpro.ca", 401, null, "other.ca|2026-10-22", now)).toBe("unknown");
    expect(resolveDomainProof("mail.unpro.ca", 401, null, "mail.unpro.ca|2026-08-01", now)).toBe("unknown");
    expect(resolveDomainProof("mail.unpro.ca", 401, null, "mail.unpro.ca|2026-12-01", now)).toBe("unknown");
    expect(resolveDomainProof("mail.unpro.ca", 500, null, "mail.unpro.ca|2026-10-22", now)).toBe("unknown");
  });
  it("401 + fresh owner-approved proof for exact domain → verified", () => {
    expect(resolveDomainProof("mail.unpro.ca", 401, null, "mail.unpro.ca|2026-10-22T15:00:00Z", now)).toBe("verified");
  });
});

describe("unsubscribe link is a real route", () => {
  it("router has /unsubscribe and the page posts the token to handle-email-unsubscribe", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/app/router.tsx", "utf8")).toContain('path="/unsubscribe"');
    const page = readFileSync("src/pages/Unsubscribe.tsx", "utf8");
    expect(page).toContain('params.get("token")');
    expect(page).toContain("handle-email-unsubscribe");
  });
});
