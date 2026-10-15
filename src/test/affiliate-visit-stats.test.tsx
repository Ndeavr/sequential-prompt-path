import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, track } = vi.hoisted(() => ({ rpc: vi.fn(), track: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useReferralAttribution", () => ({ trackReferralEvent: track }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));
vi.mock("react-router-dom", async (original) => ({ ...(await original<typeof import("react-router-dom")>()), useParams: () => ({ affiliateSlug: "sample" }) }));
import { AffiliateVisitStats } from "@/features/affiliate/components/AffiliateVisitStats";
import PageAffiliateEntry from "@/pages/affiliate/PageAffiliateEntry";

function stats() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AffiliateVisitStats affiliateId="affiliate-id" /></QueryClientProvider>);
}

afterEach(cleanup);
beforeEach(() => { rpc.mockReset(); track.mockReset(); localStorage.clear(); });

describe("affiliate visit reporting", () => {
  it("requests only authenticated aggregates and displays available history", async () => {
    rpc.mockResolvedValue({ data: { views: 8, sessions: 6, excludedViews: 2, missingSessionViews: 0, firstVisit: null }, error: null });
    stats();
    expect(await screen.findByText("8")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(rpc).toHaveBeenCalledWith("get_affiliate_visit_stats", { p_affiliate_id: "affiliate-id" });
  });
  it("shows unavailable rather than a false zero when RPC is missing or denied", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Access denied" } });
    stats();
    expect(await screen.findByText(/Suivi temporairement indisponible/)).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });
  it("clears only legacy self-attribution manufactured by the workspace entrance", async () => {
    localStorage.setItem("unpro_ref", JSON.stringify({ refCode: "SELF", utmSource: "affiliate_entry" }));
    rpc.mockResolvedValue({ data: [{ slug: "sample", first_name: "Test", status: "active", referral_code: "SELF", has_account: true }], error: null });
    render(<HelmetProvider><MemoryRouter><PageAffiliateEntry /></MemoryRouter></HelmetProvider>);
    await screen.findByText("Bonjour Test");
    expect(localStorage.getItem("unpro_ref")).toBeNull();
  });
  it("workspace entrance preserves another affiliate referral and never writes its own", async () => {
    const ref = JSON.stringify({ refCode: "OTHER", capturedAt: "2026-10-15" });
    localStorage.setItem("unpro_ref", ref);
    rpc.mockResolvedValue({ data: [{ slug: "sample", first_name: "Test", status: "active", referral_code: "SELF", has_account: false }], error: null });
    render(<HelmetProvider><MemoryRouter><PageAffiliateEntry /></MemoryRouter></HelmetProvider>);
    await waitFor(() => expect(screen.getByText("Bonjour Test")).toBeTruthy());
    expect(localStorage.getItem("unpro_ref")).toBe(ref);
    expect(track).toHaveBeenCalledWith("affiliate_entry_visit", "SELF", expect.anything());
  });
});
