import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mock = vi.hoisted(() => ({ session: vi.fn(), invoke: vi.fn(), redirect: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mock.session }, functions: { invoke: mock.invoke }, rpc: async () => ({ data: { status: 'draft', available: null, pioneer_status: 'draft', checkout_supported: false }, error: null }) } }));
vi.mock("@/services/clara/claraContractorQualification", () => ({ getClaraQualification: () => ({ business_name: "" }) }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/redirectToCheckout", () => ({ redirectToCheckout: mock.redirect }));

import Entry350FastCheckout from "@/components/entrepreneur/Entry350FastCheckout";

const view = (q = "") => render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><Entry350FastCheckout query={new URLSearchParams(q)} /></MemoryRouter></QueryClientProvider>);

describe("Option Fondateur 1 995 $ — secondaire, consentement exigé (synthétique)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mock.session.mockResolvedValue({ data: { session: { user: { id: "synthetic-only" } } }, error: null });
    mock.invoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/c/pay/cs_test_synthetic" }, error: null });
  });
  afterEach(() => cleanup());

  it("350 $ affiché d'abord, label exact, option Fondateur non sélectionnée", () => {
    view();
    expect(screen.getByTestId("entry-350-price").textContent).toContain("350 $");
    expect(screen.getByTestId("entry-350-payment-label").textContent).toBe("Paiement unique · sans abonnement automatique · taxes en sus");
    expect(screen.queryByTestId("entry-founder-details")).toBeNull();
  });

  it("CTA principal 350 $ n'envoie aucune offre Fondateur", async () => {
    view();
    fireEvent.change(screen.getByTestId("entry-350-business-name"), { target: { value: "Atelier" } });
    fireEvent.click(screen.getByTestId("entry-350-checkout"));
    await waitFor(() => expect(mock.invoke).toHaveBeenCalled());
    expect(mock.invoke.mock.calls[0][1].body.presenceOffer).toBeUndefined();
  });

  it("Fondateur : modalités, illustration, consentement requis, puis offre envoyée", async () => {
    view();
    fireEvent.change(screen.getByTestId("entry-350-business-name"), { target: { value: "Atelier" } });
    fireEvent.click(screen.getByTestId("entry-founder-toggle"));
    expect(screen.getByTestId("entry-350-price").textContent).toContain("1 995 $");
    expect(screen.getByTestId("entry-founder-taxes").textContent).toContain("2 293,75 $");
    expect(screen.getByTestId("entry-founder-illustration").textContent).toContain("pas un ancien prix UNPRO");
    expect(screen.getByTestId("entry-founder-details").textContent).toMatch(/Aucun rendez-vous, aucune priorité, aucune exclusivité/);
    expect(screen.getByTestId("entry-founder-details").textContent).toMatch(/jamais garanties/);
    expect(screen.queryByTestId("entry-350-promo-toggle")).toBeNull();
    const cta = screen.getByTestId("entry-350-checkout") as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("entry-founder-consent"));
    expect(cta.disabled).toBe(false);
    fireEvent.click(cta);
    await waitFor(() => expect(mock.invoke).toHaveBeenCalled());
    expect(mock.invoke.mock.calls[0][1].body).toMatchObject({ entryActivation: true, presenceOffer: "founder_120m" });
    expect(mock.invoke.mock.calls[0][1].body.entryPromoCode).toBeUndefined();
  });

  it("LIVE Fondateur fermé côté serveur : message clair, aucune redirection", async () => {
    mock.invoke.mockResolvedValue({ data: { code: "founder_live_not_released", error: "L'option Fondateur n'est pas encore ouverte au paiement. Rien n'a été facturé." }, error: null });
    view();
    fireEvent.change(screen.getByTestId("entry-350-business-name"), { target: { value: "Atelier" } });
    fireEvent.click(screen.getByTestId("entry-founder-toggle"));
    fireEvent.click(screen.getByTestId("entry-founder-consent"));
    fireEvent.click(screen.getByTestId("entry-350-checkout"));
    expect(await screen.findByText(/pas encore ouverte au paiement/)).toBeTruthy();
    expect(mock.redirect).not.toHaveBeenCalled();
  });

  it("option Fondateur absente avec garantie ou proposition", () => {
    view("?offre=10-contrats");
    expect(screen.queryByTestId("entry-founder-toggle")).toBeNull();
  });
});
