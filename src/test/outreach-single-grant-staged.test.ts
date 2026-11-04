import { describe, it, expect, vi } from "vitest";
import { handleSend, type Deps } from "../../staged/outreach-single-grant/handler";

const SRK = "srk_test_key";
function deps(over: Partial<Deps> = {}): Deps {
  return {
    serviceRoleKey: SRK, founderEmail: "founder@unpro.ca", postalAddress: "281 rue Saint-Paul E., Montréal H2Y 1H1",
    unsubscribeBaseUrl: "https://unpro.ca/unsubscribe", senderFrom: "UNPRO <a@send.unpro.ca>", senderDomain: "send.unpro.ca",
    hasProviderKey: true,
    outreachEnabled: async () => false,
    autopilotOpen: async () => ({ allowed: true, reason: null }),
    senderDomainVerified: async () => "verified",
    isSuppressed: async () => false,
    hasReviewedEmailConsent: async () => true,
    createUnsubscribeToken: async () => "tok_abcdefghijklmnop",
    claim: async () => "claimed",
    settle: async () => undefined,
    sha256: async (s) => "h_" + s.length,
    providerSend: vi.fn(async () => ({ status: 200, body: { id: "prov_1" } })),
    log: async () => undefined,
    findSingleSendGrant: async (e, c) => (e === "x@example.com" && c === "camp" ? { id: "g1" } : null),
    consumeSingleSendGrant: vi.fn(async () => undefined),
    ...over,
  };
}
const body = (to = "x@example.com") => ({ to, subject: "S", html: '<a href="https://unpro.ca/entrepreneurs">x</a>', campaign: "camp", purpose: "commercial_outreach" });

describe("staged single-recipient grant", () => {
  it("no grant → still OUTREACH_DISABLED", async () => {
    const r = await handleSend(`Bearer ${SRK}`, body("other@example.com"), deps());
    expect(r.body.reason).toBe("OUTREACH_DISABLED");
  });
  it("grant never bypasses the autopilot gate", async () => {
    const d = deps({ autopilotOpen: async () => ({ allowed: false, reason: "no_recent_e2e_pass" }) });
    const r = await handleSend(`Bearer ${SRK}`, body(), d);
    expect(r.body.reason).toBe("AUTOPILOT_GATED");
    expect(d.providerSend).not.toHaveBeenCalled();
  });
  it("grant never bypasses CASL review or suppression", async () => {
    expect((await handleSend(`Bearer ${SRK}`, body(), deps({ hasReviewedEmailConsent: async () => false }))).body.reason).toBe("NO_REVIEWED_CASL_EVIDENCE");
    expect((await handleSend(`Bearer ${SRK}`, body(), deps({ isSuppressed: async () => true }))).body.reason).toBe("RECIPIENT_SUPPRESSED");
  });
  it("grant + all gates → one send, grant consumed with provider id", async () => {
    const d = deps();
    const r = await handleSend(`Bearer ${SRK}`, body(), d);
    expect(r.status).toBe(200);
    expect(d.consumeSingleSendGrant).toHaveBeenCalledWith("g1", "prov_1");
  });
});
