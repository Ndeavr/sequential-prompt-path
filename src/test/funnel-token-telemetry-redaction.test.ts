import { describe, expect, it } from "vitest";
import { sanitizeFunnelPath, sanitizeFunnelMetadata } from "@/lib/analytics/funnelEventRedaction";

describe("funnel telemetry privacy redaction", () => {
  it("removes tokenized route segments and query parameters", () => {
    expect(sanitizeFunnelPath("/unpro/activate/sample-fixture?utm_source=organic")).toBe("/unpro/activate/:token");
    expect(sanitizeFunnelPath("/unpro/audit/sample-fixture")).toBe("/unpro/audit/:token");
    expect(sanitizeFunnelPath("/entrepreneurs/audit-ia?utm_campaign=launch")).toBe("/entrepreneurs/audit-ia");
  });

  it("redacts nested secret fields while preserving cohort data", () => {
    const result = sanitizeFunnelMetadata({
      territory: "Laval",
      token: "fixture-value",
      auth: { invite_token: "fixture-value", otp_code: "fixture-code", hint: "ref fixture-value" },
      landing_url: "/unpro/activate/fixture-value?utm_source=partner",
    }, ["fixture-value"]);
    expect(result).toEqual({
      territory: "Laval",
      token: "[redacted]",
      auth: { invite_token: "[redacted]", otp_code: "[redacted]", hint: "ref [redacted]" },
      landing_url: "/unpro/activate/:token",
    });
  });
});