/** Regression coverage for the canonical contractor self-service funnel. */
import { describe, expect, it } from "vitest";
import {
  readAttribution,
  buildContractorEntryUrl,
} from "@/config/contractorFunnel";

describe("contractor self-service attribution", () => {
  it("preserves invitation, affiliate and campaign parameters when reading an entry URL", () => {
    expect(
      readAttribution("?token=invite-123&aff=partenaire42&utm_source=sms&utm_campaign=onboarding&irrelevant=discard"),
    ).toEqual({
      token: "invite-123",
      aff: "partenaire42",
      utm_source: "sms",
      utm_campaign: "onboarding",
    });
  });

  it("builds a safe analysis route with the server run id without exposing user input", () => {
    const path = buildContractorEntryUrl({ run: "run-123" }, "/contractor/analysis");
    const url = new URL(path, "https://unpro.ca");
    expect(url.pathname).toBe("/contractor/analysis");
    expect(url.searchParams.get("run")).toBe("run-123");
    expect(path).not.toContain("isroyal.ca");
  });

  it("encodes unusual run ids rather than concatenating raw query text", () => {
    const path = buildContractorEntryUrl({ run: "a&b=1" }, "/contractor/analysis");
    const url = new URL(path, "https://unpro.ca");
    expect(url.searchParams.get("run")).toBe("a&b=1");
    expect(url.searchParams.get("b")).toBeNull();
  });
});
