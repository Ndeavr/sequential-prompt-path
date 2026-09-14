import { describe, expect, it } from "vitest";

const integrationUrl = process.env.FOUNDER_ELIGIBILITY_INTEGRATION_URL;
const integrationAnonKey = process.env.FOUNDER_ELIGIBILITY_INTEGRATION_ANON_KEY;
const describeIntegration = integrationUrl && integrationAnonKey ? describe : describe.skip;

/**
 * This is intentionally skipped in ordinary unit-test and CI runs. Configure
 * both variables with an isolated Supabase test project to exercise the live
 * RPC; it must never fall back to a production URL or key.
 */
describeIntegration("founder eligibility RPC integration", () => {
  it("rejects a professional category at the database boundary", async () => {
    const response = await fetch(`${integrationUrl}/rest/v1/rpc/check_founder_eligibility`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: integrationAnonKey!,
        Authorization: `Bearer ${integrationAnonKey!}`,
      },
      body: JSON.stringify({ p_city: "Laval", p_category_slug: "notaire" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      eligible: false,
      reason: "category_not_eligible",
    });
  });
});
