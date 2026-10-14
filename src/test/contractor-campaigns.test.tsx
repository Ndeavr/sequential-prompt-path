import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { campaignLink, creditCampaignHref } from "@/lib/contractorCampaignLinks";
import CreditCampaignNotice from "@/components/contractor/CreditCampaignNotice";
import ContractorAffiliateTeaser from "@/components/contractor/ContractorAffiliateTeaser";
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));
afterEach(cleanup);
describe("contractor campaign navigation", () => {
  it("preserves affiliate and validated intake context without forging an offer ID", () => {
    const url = new URL(creditCampaignHref("?ref=ABC&aff=partner&t=token&prospect_id=42&utm_term=roof&audit=aa&audit_token=bb&offer=credit_1000&checkout=success"), "https://unpro.ca");
    expect(url.pathname).toBe("/entrepreneur/devis-personnalise");
    for (const [k,v] of Object.entries({ref:"ABC",aff:"partner",t:"token",prospect_id:"42",utm_term:"roof",audit:"aa",audit_token:"bb",campaign:"credit_1000"})) expect(url.searchParams.get(k)).toBe(v);
    expect(url.searchParams.has("offer")).toBe(false);
    expect(url.searchParams.has("checkout")).toBe(false);
  });
  it("preserves referrals through affiliate CTA", () => {
    expect(campaignLink("/affilies/onboarding", "?ref=AB&utm_source=sms")).toBe("/affilies/onboarding?ref=AB&utm_source=sms");
  });
  it("shows pending credit conditions only for the promotional journey", () => {
    const { unmount } = render(<MemoryRouter initialEntries={["/?campaign=credit_1000"]}><CreditCampaignNotice /></MemoryRouter>);
    expect(screen.getByRole("note")).toHaveTextContent("ne garantit pas ce crédit");
    unmount();
    render(<MemoryRouter><CreditCampaignNotice /></MemoryRouter>);
    expect(screen.queryByRole("note")).toBeNull();
  });
  it("links the teaser to the explanation with attribution intact", () => {
    render(<MemoryRouter initialEntries={["/entrepreneurs?ref=AB"]}><ContractorAffiliateTeaser /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Par ici/ })).toHaveAttribute("href", "/entrepreneurs/affiliation?ref=AB");
    expect(screen.getByText(/Revenus non garantis/)).toBeVisible();
  });
});
