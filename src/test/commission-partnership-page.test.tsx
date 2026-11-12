import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "fs";

vi.mock("@/layouts/MainLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import PageCommissionPartnership from "@/pages/entrepreneur/PageCommissionPartnership";
import { FOUNDER_BOOKING_URL, resolveFounderBookingUrl } from "@/config/founderBooking";

afterEach(() => cleanup());
const head = (sel: string) => document.head.querySelector(sel);

describe("Page 100 % à la commission", () => {
  it("FR : H1, SEO, canonique et hreflang", () => {
    render(<MemoryRouter><PageCommissionPartnership /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("100 % à la commission. Une formule réservée à certains entrepreneurs.");
    expect(document.title).toContain("UNPRO");
    expect((head('link[rel="canonical"]') as HTMLLinkElement).href).toBe("https://unpro.ca/commission");
    expect((head('link[hreflang="en-CA"]') as HTMLLinkElement).href).toBe("https://unpro.ca/en/commission");
  });

  it("aucun agenda fondateur vérifié : CTA vers la section in-page, aucun lien Google Agenda", () => {
    expect(FOUNDER_BOOKING_URL).toBeNull();
    render(<MemoryRouter><PageCommissionPartnership /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: /Prendre rendez-vous pour en discuter/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Choisir un moment pour discuter/ }).getAttribute("href")).toBe("#choisir-un-moment");
    expect(screen.getByRole("link", { name: /Proposer un moment pour discuter d'un partenariat/ }).getAttribute("href")).toBe("#choisir-un-moment");
    expect(document.getElementById("choisir-un-moment")).not.toBeNull();
    const hrefs = Array.from(document.querySelectorAll("a")).map((a) => a.getAttribute("href") || "");
    hrefs.forEach((h) => expect(h).not.toMatch(/calendly|cal\.com|calendar\.google|^#$|^$/));
    expect(document.body.innerHTML).not.toMatch(/calendar\.google|cid=/);
  });

  it("n'accepte qu'une URL https pour l'agenda", () => {
    expect(resolveFounderBookingUrl("javascript:alert(1)")).toBeNull();
    expect(resolveFounderBookingUrl("http://exemple.ca")).toBeNull();
    expect(resolveFounderBookingUrl("pas une url")).toBeNull();
    expect(resolveFounderBookingUrl("https://exemple.ca/rdv")).toBe("https://exemple.ca/rdv");
  });

  it("aucun prix, taux ni promesse de contrat; nuance « pas un taux de 100 % »", () => {
    render(<MemoryRouter><PageCommissionPartnership /></MemoryRouter>);
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/\d[\d\s]*\s?\$/);
    expect(text).not.toMatch(/\b(10|6|3|1)\s?%/);
    expect(text).toMatch(/pas d'un taux de commission de 100 %/);
    expect(text).not.toMatch(/contrats garantis|exclusivité garantie|garantissons/i);
    expect(screen.getByRole("heading", { name: "Vous avez une proposition de partenariat ?" })).toBeInTheDocument();
  });

  it("EN : H1 et canonique", () => {
    render(<MemoryRouter><PageCommissionPartnership lang="en" /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("100% commission. A formula reserved for certain contractors.");
    expect((head('link[rel="canonical"]') as HTMLLinkElement).href).toBe("https://unpro.ca/en/commission");
    expect(screen.getByRole("link", { name: /Choose a time to talk/ }).getAttribute("href")).toBe("#choisir-un-moment");
  });

  it("routeur, sitemap et lien depuis /entrepreneurs; /fondateurs intact", () => {
    const router = readFileSync("src/app/router.tsx", "utf8");
    expect(router).toContain('path="/commission"');
    expect(router).toContain('path="/en/commission"');
    expect(router).toContain('path="/fondateurs"');
    expect(readFileSync("scripts/generate-sitemaps.ts", "utf8")).toContain('{ path: "/commission"');
    const landing = readFileSync("src/pages/entrepreneur/PageEntrepreneursLanding.tsx", "utf8");
    expect(landing).toContain('"/commission"');
    expect(landing).toContain("350 $ + taxes par année.");
  });
});
