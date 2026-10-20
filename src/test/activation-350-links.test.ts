import { describe, it, expect } from "vitest";
import { buildActivation350Links, normalizeRef } from "@/lib/activation350Links";

describe("Page activation 350 $ — liens", () => {
  it("conserve le code ref vers l'activation et l'audit", () => {
    const l = buildActivation350Links(new URLSearchParams("ref=lorraine-unpro&utm_source=sms"));
    expect(l.activate).toContain("ref=LORRAINE-UNPRO");
    expect(l.activate).toContain("from=activation_350");
    expect(l.activate.startsWith("/entrepreneur/devis-personnalise?")).toBe(true);
    expect(l.audit).toBe("/entrepreneurs/audit-ia?utm_source=sms&ref=LORRAINE-UNPRO");
  });
  it("rejette un ref malformé", () => {
    expect(normalizeRef("<script>")).toBeNull();
    expect(buildActivation350Links(new URLSearchParams("")).audit).toBe("/entrepreneurs/audit-ia");
  });
});
