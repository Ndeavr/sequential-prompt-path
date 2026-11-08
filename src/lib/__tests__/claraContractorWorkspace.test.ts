import { describe, expect, it } from "vitest";
import { buildClaraWorkItems, detectContractorEntry, dossierValue, type AccountEvidence, type DraftEvidence, tallyAppointments } from "@/lib/claraContractorWorkspace";

const draft: DraftEvidence = { savedAt: "2026-11-07T12:00:00Z", status: "in_progress", completedAt: null, missingKeys: ["territories", "availability"], website: "https://exemple.ca/", trade: null };
const signedIn = (patch: Partial<AccountEvidence> = {}): AccountEvidence => ({ signedIn: true, activation: "none", publication: "unpublished", appointments: tallyAppointments([]), ...patch });
const byKey = (items: ReturnType<typeof buildClaraWorkItems>, key: string) => items.find(item => item.key === key);

describe("single business entry field", () => {
  it("routes a domain to website and a spaced name to name", () => {
    expect(detectContractorEntry("toitures-exemple.ca")).toEqual({ name: "", website: "https://toitures-exemple.ca/" });
    expect(detectContractorEntry("Toitures Exemple inc.")).toEqual({ name: "Toitures Exemple inc.", website: "" });
    expect(detectContractorEntry("http://localhost")).toBeNull();
    expect(detectContractorEntry(" ")).toBeNull();
  });
});

describe("returning identity precedence", () => {
  it("keeps a saved answer over account data", () => {
    expect(dossierValue("Confirmé", "Compte")).toEqual({ value: "Confirmé", source: "saved" });
    expect(dossierValue("", "Compte")).toEqual({ value: "Compte", source: "account" });
    expect(dossierValue(null, null).source).toBe("none");
  });
});

describe("Clara work panel evidence", () => {
  it("never claims an automatic website reading", () => {
    expect(byKey(buildClaraWorkItems({ draft, account: signedIn() }, true), "website")?.state).toBe("not_done");
  });

  it("lists the server-computed fields to confirm", () => {
    const item = byKey(buildClaraWorkItems({ draft, account: signedIn() }, true), "confirm");
    expect(item?.state).toBe("pending");
    expect(item?.title).toContain("2");
  });

  it("keeps unknown evidence unknown, not zero", () => {
    const items = buildClaraWorkItems({ draft: { ...draft, missingKeys: null }, account: signedIn({ appointments: null, publication: "unknown", activation: "unknown" }) }, true);
    expect(byKey(items, "confirm")?.state).toBe("unknown");
    expect(byKey(items, "appointments")?.state).toBe("unknown");
    expect(byKey(items, "appointments")?.title).not.toContain("0");
    expect(byKey(items, "publication")?.state).toBe("unknown");
  });

  it("shows a Stripe return as pending until the server confirms", () => {
    expect(byKey(buildClaraWorkItems({ account: signedIn(), returnedFromCheckout: true }, true), "activation")?.state).toBe("pending");
    expect(byKey(buildClaraWorkItems({ account: signedIn({ activation: "entry_paid" }), returnedFromCheckout: true }, true), "activation")?.state).toBe("done");
    expect(byKey(buildClaraWorkItems({ account: { signedIn: false, activation: "unknown", publication: "unknown", appointments: null }, returnedFromCheckout: true }, true), "activation")?.state).toBe("pending");
  });

  it("does not show account state to a signed-out visitor", () => {
    const items = buildClaraWorkItems({ draft, account: { signedIn: false, activation: "unknown", publication: "unknown", appointments: null } }, false);
    expect(items.map(item => item.key)).not.toContain("appointments");
    expect(items.map(item => item.key)).not.toContain("publication");
  });

  it("separates a prepared profile from a published one", () => {
    expect(byKey(buildClaraWorkItems({ account: signedIn({ publication: "unpublished" }) }, true), "publication")?.state).toBe("not_done");
    expect(byKey(buildClaraWorkItems({ account: signedIn({ publication: "verified_active" }) }, true), "publication")?.state).toBe("done");
  });

  it("counts only recorded appointments", () => {
    expect(byKey(buildClaraWorkItems({ account: signedIn({ appointments: tallyAppointments(["confirmed", "requested", "cancelled"]) }) }, true), "appointments")?.title).toContain("3");
  });
});
