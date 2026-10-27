import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: vi.fn() }, functions: { invoke: vi.fn() } } }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));

import { EntryActivation350Card } from "@/components/entrepreneur/EntryActivation350Card";

const base = { quoteId: "q1", successUrl: "/s", cancelUrl: "/c", onLogin: () => {}, onMore: () => {} };

describe("Activation d'entrée 350 $", () => {
  it("n'affiche aucun chiffre sans garantie serveur", () => {
    render(<EntryActivation350Card {...base} guaranteedAppointments={null} />);
    // Message véridique actuel (ENTRY_350.appointmentsPending) : zéro rendez-vous inclus.
    const appts = screen.getByTestId("entry-350-appointments").textContent ?? "";
    expect(appts).toContain("Aucun rendez-vous inclus");
    expect(appts).toContain("confirmé avant le paiement");
    // CTA actuel : « + taxes » explicite (paiement unique 350 $ + taxes).
    expect(screen.getAllByText("Activer mon profil — 350 $ + taxes").length).toBeGreaterThan(0);
    expect(screen.getByText("J'aimerais plus de rendez-vous dès maintenant")).toBeTruthy();
  });
  it("affiche exactement le nombre garanti par le serveur", () => {
    render(<EntryActivation350Card {...base} guaranteedAppointments={3} />);
    expect(screen.getByTestId("entry-350-appointments").textContent).toMatch(/^3 rendez-vous/);
  });
  it("le serveur fixe le montant, refuse la double activation et le webhook est idempotent", () => {
    const co = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
    expect(co).toMatch(/code: "already_active"/);
    expect(co).toMatch(/offer: isEntryActivation \? "entry_activation_350"/);
    const wh = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    const i = wh.indexOf('if (session.metadata?.offer === "entry_activation_350")');
    expect(i).toBeGreaterThan(0);
    const branch = wh.slice(i, wh.indexOf("// ── OFFRE DE REPLI", i));
    expect(branch).toMatch(/payment_status === "paid"/);
    expect(branch).toMatch(/entry_activation_350_paid/);
    expect(branch).toMatch(/sessionAlreadyInLedger: !!already/);
  });
});
