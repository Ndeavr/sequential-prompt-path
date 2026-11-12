import { describe, it, expect } from "vitest";
import { buildCommissionClaraLink } from "./commissionPartnershipIntake";

describe("buildCommissionClaraLink", () => {
  it("opens the existing Clara route with contractor commission context", () => {
    const url = buildCommissionClaraLink(true);
    expect(url.startsWith("/alex?q=")).toBe(true);
    const q = decodeURIComponent(url.slice("/alex?q=".length));
    expect(q).toContain("Je suis entrepreneur");
    expect(q).toContain("commission");
  });
  it("never carries historical rates or advances", () => {
    for (const fr of [true, false]) {
      const q = decodeURIComponent(buildCommissionClaraLink(fr));
      expect(q).not.toMatch(/\d+\s?%?\s?(\$|%)?\s*(10|6|3|1)\s?%|400|800/);
    }
  });
});
