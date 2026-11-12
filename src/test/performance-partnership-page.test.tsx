import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "fs";

vi.mock("@/layouts/MainLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
type Res = { data: unknown; error: unknown };
const calls: { fn: string; body: Record<string, unknown> }[] = [];
let slotsRes: Res = { data: { mode: "unavailable", reason: "test" }, error: null };
let bookRes: Res = { data: { status: "fallback" }, error: null };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: async (fn: string, o: { body: Record<string, unknown> }) => {
    calls.push({ fn, body: o.body });
    if (fn === "founder-meeting") return o.body.action === "slots" ? slotsRes : bookRes;
    return { data: { ok: true, id: "00000000-0000-0000-0000-000000000009" }, error: null };
  } } },
}));

import PagePerformancePartnership from "@/pages/entrepreneur/PagePerformancePartnership";
import { withSourceLine } from "@/pages/entrepreneur/FounderMeetingRequest";

const LIVE = [
  { start: "2027-01-12T15:00:00.000Z", end: "2027-01-12T16:30:00.000Z" },
  { start: "2027-01-12T16:30:00.000Z", end: "2027-01-12T18:00:00.000Z" },
  { start: "2027-01-12T18:00:00.000Z", end: "2027-01-12T19:30:00.000Z" },
];
afterEach(() => { cleanup(); calls.length = 0; slotsRes = { data: { mode: "unavailable", reason: "test" }, error: null }; window.history.replaceState({}, "", "/"); sessionStorage.clear(); });
const head = (sel: string) => document.head.querySelector(sel);
const mount = (lang?: "en") => render(<MemoryRouter><PagePerformancePartnership lang={lang} /></MemoryRouter>);

describe("Landing partenariat performance", () => {
  it("FR : H1, canonique, hreflang et lien vers /commission", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Votre entreprise a du potentiel. Et si on partageait les profits de sa croissance ?");
    expect((head('link[rel="canonical"]') as HTMLLinkElement).href).toBe("https://unpro.ca/partenariat-performance");
    expect((head('link[hreflang="en-CA"]') as HTMLLinkElement).href).toBe("https://unpro.ca/en/performance-partnership");
    expect(screen.getByRole("link", { name: /conditions détaillées/ }).getAttribute("href")).toBe("/commission");
  });

  it("aucun taux, montant, profit garanti ni exclusivité promise", () => {
    mount();
    const t = document.body.textContent || "";
    expect(t).not.toMatch(/\d\s?%|\d[\d\s]*\s?\$/);
    expect(t).not.toMatch(/profits garantis|contrats garantis|garantissons/i);
    expect(t).toMatch(/Aucun contrat, aucun volume et aucune exclusivité ne sont garantis/);
  });

  it("CTA → section rendez-vous; durée 1 h annoncée avec plage de 90 min; sujet imposé", async () => {
    mount();
    const cta = screen.getAllByRole("link", { name: /Évaluer mon potentiel — prendre rendez-vous/ })[0];
    expect(cta.getAttribute("href")).toBe("#evaluer-mon-potentiel");
    expect(screen.getByRole("link", { name: /Comment fonctionne ce partenariat/ }).getAttribute("href")).toBe("#comment-ca-fonctionne");
    expect(await screen.findByText(/environ une heure; prévoir une plage de 90 minutes/)).toBeInTheDocument();
    expect(screen.queryByText("Sujet de la rencontre")).toBeNull();
  });

  it("repli : horaires sous réserve; demande enregistrée avec source + UTM, sujet partenariat", async () => {
    window.history.replaceState({}, "", "/partenariat-performance?utm_source=facebook&utm_campaign=perf");
    mount();
    expect(await screen.findByText(/sous réserve de confirmation/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "QA" } });
    fireEvent.change(screen.getByLabelText("Entreprise"), { target: { value: "Exemple inc." } });
    fireEvent.change(screen.getByLabelText("Courriel"), { target: { value: "qa@example.test" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    await waitFor(() => expect(screen.getByText("Demande envoyée, nous confirmerons le rendez-vous.")).toBeInTheDocument());
    const msg = String(calls.find((c) => c.fn === "submit-supplier-partnership")!.body.message);
    expect(msg).toContain("Sujet : Proposition de partenariat");
    expect(msg).toContain("Source : /partenariat-performance · utm_source=facebook utm_campaign=perf");
  });

  it("live : 3 moments libres, réservation avec topic partnership, confirmé seulement sur status confirmed", async () => {
    slotsRes = { data: { mode: "live", slots: LIVE }, error: null };
    bookRes = { data: { status: "confirmed", slot: LIVE[0] }, error: null };
    mount();
    expect(await screen.findAllByRole("radio")).toHaveLength(3);
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "QA" } });
    fireEvent.change(screen.getByLabelText("Entreprise"), { target: { value: "Exemple inc." } });
    fireEvent.change(screen.getByLabelText("Courriel"), { target: { value: "qa@example.test" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Réserver ce moment" }));
    await waitFor(() => expect(screen.getByText("Rendez-vous confirmé.")).toBeInTheDocument());
    const b = calls.find((c) => c.fn === "founder-meeting" && c.body.action === "book")!.body;
    expect(b.topic).toBe("partnership");
    expect(String(b.message)).toContain("Source : /partenariat-performance");
  });

  it("EN : H1 et canonique", () => {
    mount("en");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Your business has potential. What if we shared the profits of its growth?");
    expect((head('link[rel="canonical"]') as HTMLLinkElement).href).toBe("https://unpro.ca/en/performance-partnership");
  });

  it("source tronquée dans la limite serveur de 1200 caractères", () => {
    expect(withSourceLine("x".repeat(2000), "/p").length).toBeLessThanOrEqual(1200);
    expect(withSourceLine("", undefined)).toBe("");
  });

  it("routes, sitemap; /commission, /entrepreneurs et 350 $ intacts", () => {
    const router = readFileSync("src/app/router.tsx", "utf8");
    expect(router).toContain('path="/partenariat-performance"');
    expect(router).toContain('path="/en/performance-partnership"');
    expect(router).toContain('path="/commission"');
    expect(readFileSync("scripts/generate-sitemaps.ts", "utf8")).toContain('{ path: "/partenariat-performance"');
    expect(readFileSync("src/pages/entrepreneur/PageEntrepreneursLanding.tsx", "utf8")).toContain("350 $ + taxes par année.");
  });
});
