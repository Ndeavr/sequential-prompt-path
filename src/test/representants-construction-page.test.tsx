import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";

const m = vi.hoisted(() => ({ invoke: vi.fn(), events: [] as string[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: m.invoke } } }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: (e: { event_type: string }) => { m.events.push(e.event_type); return Promise.resolve(); } }));

import PageRepresentantsConstruction from "@/pages/careers/PageRepresentantsConstruction";
import { EMPTY_REP_FORM, validateRepForm, toRepPayload } from "@/lib/representativeApplication";

const head = (sel: string) => document.head.querySelector(sel);
const renderFr = () => render(<MemoryRouter><PageRepresentantsConstruction /></MemoryRouter>);
beforeEach(() => { m.invoke.mockReset(); m.events.length = 0; sessionStorage.clear(); });
afterEach(() => cleanup());

const fill = () => {
  fireEvent.change(screen.getByLabelText(/Nom complet/), { target: { value: "Test Synthétique" } });
  fireEvent.change(screen.getByLabelText(/^Courriel/), { target: { value: "rep@example.test" } });
  fireEvent.change(screen.getByLabelText(/Région ou ville/), { target: { value: "Laval" } });
  fireEvent.click(screen.getByRole("button", { name: "Les deux" }));
  fireEvent.click(screen.getByLabelText(/J'ai lu : rôle à commission/));
  fireEvent.click(screen.getByLabelText(/J'accepte qu'UNPRO conserve/));
};

describe("Recrutement représentants", () => {
  it("FR : hero exact, canonique, hreflang, WebPage sans JobPosting", () => {
    renderFr();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Vous connaissez le monde de la construction? Bâtissez quelque chose de nouveau.");
    expect(screen.getByText("Un nouveau marché. Une nouvelle façon d'aider les entrepreneurs. Une occasion de grandir avec UNPRO.")).toBeInTheDocument();
    expect((head('link[rel="canonical"]') as HTMLLinkElement).href).toBe("https://unpro.ca/carrieres/representants-construction");
    expect((head('link[hreflang="en-CA"]') as HTMLLinkElement).href).toBe("https://unpro.ca/en/careers/construction-sales-representatives");
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent).join(" ");
    expect(ld).toContain('"WebPage"');
    expect(ld).not.toContain("JobPosting");
  });

  it("EN : H1 et canonique", () => {
    render(<MemoryRouter><PageRepresentantsConstruction lang="en" /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Know the construction world? Build something new.");
    expect((head('link[rel="canonical"]') as HTMLLinkElement).href).toBe("https://unpro.ca/en/careers/construction-sales-representatives");
  });

  it("aucun terme affilié, aucun revenu garanti; statut expliqué avant le formulaire", () => {
    renderFr();
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/affili/i);
    expect(text).not.toMatch(/\d\s?\$|clients garantis|revenus garantis|garantissons/i);
    expect(text).toMatch(/Ce n'est pas un emploi salarié/);
    expect(text).toMatch(/Aucun revenu garanti/);
    expect(text.indexOf("Statut et rémunération")).toBeLessThan(text.indexOf("Envoyer ma candidature"));
  });

  it("« Je suis entrepreneur » mène à l'entrée entrepreneur existante", () => {
    renderFr();
    const links = screen.getAllByRole("link", { name: /Je suis entrepreneur/ });
    links.forEach(l => expect(l.getAttribute("href")).toBe("/entrepreneurs/audit-ia?from=carrieres-representants"));
  });

  it("validation : statut lu et consentement obligatoires", () => {
    const e = validateRepForm({ ...EMPTY_REP_FORM, full_name: "A B", email: "a@b.ca", region: "Laval", experience: "sales" });
    expect(Object.keys(e).sort()).toEqual(["follow_up_consent", "terms_acknowledged"]);
    expect(toRepPayload({ ...EMPTY_REP_FORM, full_name: " Jean  Du Pont ", email: "X@Y.CA" })).toMatchObject({ first_name: "Jean", last_name: "Du Pont", email: "x@y.ca" });
  });

  it("confirmation seulement après identifiant serveur", async () => {
    m.invoke.mockResolvedValue({ data: { ok: true, id: "11111111-1111-1111-1111-111111111111" }, error: null });
    renderFr(); fill();
    fireEvent.click(screen.getByRole("button", { name: /Envoyer ma candidature/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Candidature reçue." })).toBeInTheDocument());
    const [fn, { body }] = m.invoke.mock.calls[0];
    expect(fn).toBe("submit-representative-application");
    expect(body).toMatchObject({ terms_acknowledged: true, follow_up_consent: true, experience: "both", locale: "fr" });
    expect(m.events).toContain("rep_application_submitted");
  });

  it("échec serveur : erreur visible, saisie conservée, aucune confirmation", async () => {
    m.invoke.mockResolvedValue({ data: null, error: { context: { status: 503 } } });
    renderFr(); fill();
    fireEvent.click(screen.getByRole("button", { name: /Envoyer ma candidature/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/n'a pas pu être enregistrée/));
    expect(screen.queryByRole("heading", { name: "Candidature reçue." })).toBeNull();
    expect((screen.getByLabelText(/Nom complet/) as HTMLInputElement).value).toBe("Test Synthétique");
    expect(m.events).toContain("rep_form_error");
  });

  it("routeur et sitemap", () => {
    const router = readFileSync("src/app/router.tsx", "utf8");
    expect(router).toContain('path="/carrieres/representants-construction"');
    expect(router).toContain('path="/en/careers/construction-sales-representatives"');
    const sm = readFileSync("scripts/generate-sitemaps.ts", "utf8");
    expect(sm).toContain('{ path: "/carrieres/representants-construction"');
    expect(sm).toContain('{ path: "/en/careers/construction-sales-representatives"');
  });
});
