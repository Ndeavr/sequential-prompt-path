// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { contractorLandingDedupeKey, trackedContractorAnalysisPath } from "@/lib/analytics/contractorAdTracking";

describe("UNPRO company-specific contractor ad tracking", () => {
  it("preserves only allowlisted UTMs/ref when starting analysis", () => {
    const result = new URL(trackedContractorAnalysisPath(
      "safe-run-id",
      "?utm_source=chatgpt&utm_medium=paid&utm_campaign=unpro_qc_pros&utm_content=autonomy&ref=PARTNER-X&phone=5145551212&token=PRIVATE&session_id=STRIPE_ID",
    ), "https://unpro.ca");
    expect(result.pathname).toBe("/contractor/analysis");
    expect(Object.fromEntries(result.searchParams)).toEqual({
      run: "safe-run-id",
      utm_source: "chatgpt",
      utm_medium: "paid",
      utm_campaign: "unpro_qc_pros",
      utm_content: "autonomy",
      ref: "PARTNER-X",
    });
    expect(result.href).not.toContain("PRIVATE");
    expect(result.href).not.toContain("STRIPE_ID");
  });
  it("keeps visitor exposure stable for repeated page views without storing identity", () => {
    expect(contractorLandingDedupeKey("session-one")).toBe(contractorLandingDedupeKey("session-one"));
    expect(contractorLandingDedupeKey("session-two")).not.toBe(contractorLandingDedupeKey("session-one"));
  });
  it("does not carry excessively long campaign values", () => {
    const url = new URL(trackedContractorAnalysisPath("run", "?utm_source="+ "x".repeat(130)), "https://unpro.ca");
    expect(url.searchParams.has("utm_source")).toBe(false);
  });
  it("logs a first-party landing view and analysis start but no client-side paid success", () => {
    const page = readFileSync("src/pages/contractor/PageContractorJoinLive.tsx", "utf8");
    expect(page).toContain('event_type: "landing_view"');
    expect(page).toContain('trackFunnelStep("analysis_started"');
    expect(page).toContain("trackedContractorAnalysisPath(runId, search)");
    expect(page).not.toContain('event_type: "payment_completed"');
  });
  it("only logs Stripe checkout attempt AFTER server returned an actual checkout URL", () => {
    const page = readFileSync("src/components/entrepreneur/Entry350FastCheckout.tsx", "utf8");
    const guard = page.indexOf('if (error || reply?.error || !reply?.url) throw');
    const tracked = page.indexOf('event_type: "stripe_checkout_started"');
    const redirect = page.indexOf("redirectToCheckout(reply.url)");
    expect(guard).toBeGreaterThan(0);
    expect(tracked).toBeGreaterThan(guard);
    expect(redirect).toBeGreaterThan(tracked);
    expect(page).not.toContain('event_type: "stripe_payment_success"');
  });
  it("never waits indefinitely for optional telemetry after checkout URL creation", () => {
    const page = readFileSync("src/components/entrepreneur/Entry350FastCheckout.tsx", "utf8");
    const bounded = page.indexOf("await Promise.race([");
    const timeout = page.indexOf("new Promise<void>((resolve) => setTimeout(resolve, 500))", bounded);
    const redirect = page.indexOf("redirectToCheckout(reply.url)", bounded);
    expect(bounded).toBeGreaterThan(0);
    expect(timeout).toBeGreaterThan(bounded);
    expect(redirect).toBeGreaterThan(timeout);
    expect(page).not.toContain("await logFunnelEvent({");
  });

  it("retains Stripe LIVE payment as a separate signed server-side event", () => {
    const join = readFileSync("src/pages/contractor/PageContractorJoinLive.tsx", "utf8");
    const checkout = readFileSync("src/components/entrepreneur/Entry350FastCheckout.tsx", "utf8");
    expect(join).not.toContain("stripe_payment_success");
    expect(checkout).toContain("Le retour de Stripe");
    expect(checkout).toContain("ne prouve pas le paiement");
  });
});
