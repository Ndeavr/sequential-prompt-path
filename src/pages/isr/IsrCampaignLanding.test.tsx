import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import IsrCampaignLanding from "./IsrCampaignLanding";
import { ISR_CAMPAIGN_KEYS } from "@/lib/isrCampaign";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/seo/components/SeoHead", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } }));
vi.mock("@/services/eventTrackingService", () => ({ trackEvent: vi.fn() }));

afterEach(() => { cleanup(); sessionStorage.clear(); });

describe("ISR free inspection entry", () => {
  it("offers a free 60-minute inspection on every FR/EN campaign without an external handoff", () => {
    for (const campaign of ISR_CAMPAIGN_KEYS) {
      for (const lang of ["fr", "en"] as const) {
        const { container, unmount } = render(<MemoryRouter><IsrCampaignLanding campaign={campaign} lang={lang} /></MemoryRouter>);
        expect(screen.getByTestId("isr-cta").textContent).toContain(lang === "fr" ? "Prenez rendez-vous maintenant" : "Book your appointment now");
        expect(container.textContent).toContain(lang === "fr" ? "Inspection gratuite · Prévoyez 60 minutes" : "Free inspection · Allow 60 minutes");
        expect(container.querySelector('a[href*="isroyal.ca"]')).toBeNull();
        unmount();
      }
    }
  });
  it("asks for the address before availability and never confirms an unconfigured calendar", async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    render(<MemoryRouter><IsrCampaignLanding campaign="entretoit" lang="fr" /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("isr-cta"));
    expect(screen.getByTestId("isr-address-first")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Adresse"), { target: { value: "123 rue Test" } });
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Laval" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(await screen.findByTestId("isr-calendar-unavailable")).toHaveTextContent("Aucun rendez-vous n’a encore été réservé");
    expect(screen.queryByTestId("isr-request-saved")).toBeNull();
  });
});
