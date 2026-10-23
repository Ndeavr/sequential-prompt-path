import { describe, expect, it } from "vitest";
import { handleSend, type Deps } from "../../supabase/functions/outreach-resend-send/handler";

const SRK = "service-role-synthetic";
const html = '<html><body><p>Activation 350 $ + taxes</p><a href="https://unpro.ca/r/x">Activer</a></body></html>';
const input = { to: "info@example-synthetic.ca", subject: "Activer votre profil", html, campaign: "c1" };

function deps(over: Partial<Deps> = {}) {
  const claims = new Map<string, { status: string; attempts: number }>();
  const sent: Record<string, unknown>[] = [];
  const d: Deps = {
    serviceRoleKey: SRK, founderEmail: "danny@unpro.ca", postalAddress: "ADRESSE-SYNTHETIQUE",
    unsubscribeBaseUrl: "https://unpro.ca/unsubscribe", senderFrom: "Clara <clara@mail.unpro.ca>", senderDomain: "mail.unpro.ca",
    hasProviderKey: true,
    outreachEnabled: async () => true,
    autopilotOpen: async () => ({ allowed: true, reason: null }),
    senderDomainVerified: async () => true,
    isSuppressed: async () => false,
    hasReviewedEmailConsent: async () => true,
    createUnsubscribeToken: async () => "tok",
    sha256: async (s) => s,
    claim: async (key) => {
      await Promise.resolve();
      const c = claims.get(key);
      if (!c) { claims.set(key, { status: "sending", attempts: 1 }); return "claimed"; }
      if (c.status === "sent") return "duplicate_sent";
      if (c.status === "sending") return "duplicate_in_flight";
      if (c.attempts >= 3) return "retry_exhausted";
      c.status = "sending"; c.attempts++; return "claimed_retry";
    },
    settle: async (key, status) => { claims.get(key)!.status = status; },
    providerSend: async (p) => { sent.push(p); return { status: 200, body: { id: "re_synthetic" } }; },
    log: async () => {},
    ...over,
  };
  return { d, sent, claims };
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
    ["SENDER_DOMAIN_NOT_VERIFIED", { senderDomainVerified: async () => false }],
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
    expect(String(sent[0].html)).toContain("https://unpro.ca/unsubscribe?token=tok");
    expect((sent[0].headers as Record<string, string>)["List-Unsubscribe"]).toContain("unsubscribe?token=tok");
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
});
