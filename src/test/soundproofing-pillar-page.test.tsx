import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "fs";

vi.mock("@/layouts/MainLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import PageSoundproofingPillar from "@/pages/seo/PageSoundproofingPillar";

afterEach(() => cleanup());

const head = (sel: string) => document.head.querySelector(sel);

describe("Page pilier insonorisation", () => {
  it("FR : H1, titre, description, canonique et hreflang réciproques", () => {
    render(<MemoryRouter initialEntries={["/insonorisation"]}><PageSoundproofingPillar /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Insonorisation entre appartements et condos");
    expect(document.title).toBe("Insonorisation appartement et condo : murs, planchers, plafonds | UNPRO");
    const desc = (head('meta[name="description"]') as HTMLMetaElement).content;
    expect(desc.length).toBeGreaterThanOrEqual(130);
    expect(desc.length).toBeLessThanOrEqual(160);
    expect((head('link[rel="canonical"]') as HTMLLinkElement).href).toBe("https://unpro.ca/insonorisation");
    expect((head('link[hreflang="en-CA"]') as HTMLLinkElement).href).toBe("https://unpro.ca/en/soundproofing");
    expect((head('link[hreflang="fr-CA"]') as HTMLLinkElement).href).toBe("https://unpro.ca/insonorisation");
  });

  it("FR : CTA Clara vers /conversation et CTA entrepreneur vers /entrepreneurs", () => {
    render(<MemoryRouter><PageSoundproofingPillar /></MemoryRouter>);
    const clara = screen.getAllByRole("link", { name: /Expliquer mon problème à Clara/ });
    expect(clara.length).toBeGreaterThan(0);
    clara.forEach((a) => expect(a.getAttribute("href")).toMatch(/^\/conversation\?q=/));
    expect(screen.getByRole("link", { name: /Vous faites de l’insonorisation\? Présentez votre entreprise|Vous faites de l'insonorisation\? Présentez votre entreprise/ }).getAttribute("href")).toBe("/entrepreneurs");
    // FAQ visible en HTML, sans prix inventé
    expect(screen.getByRole("heading", { name: /Combien coûte/ })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d[\d\s]*\s?\$/);
    // Breadcrumb JSON-LD seulement (pas de FAQPage)
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.textContent || "");
    expect(ld.some((t) => t.includes("BreadcrumbList"))).toBe(true);
    expect(ld.some((t) => t.includes("FAQPage"))).toBe(false);
  });

  it("EN : canonique et lang réciproques", () => {
    render(<MemoryRouter initialEntries={["/en/soundproofing"]}><PageSoundproofingPillar lang="en" /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Soundproofing between apartments and condos");
    expect((head('link[rel="canonical"]') as HTMLLinkElement).href).toBe("https://unpro.ca/en/soundproofing");
    expect((head('link[hreflang="fr-CA"]') as HTMLLinkElement).href).toBe("https://unpro.ca/insonorisation");
    expect(document.documentElement.lang).toBe("en-CA");
  });

  it("le sitemap et le routeur déclarent les deux URL", () => {
    const sitemapScript = readFileSync("scripts/generate-sitemaps.ts", "utf8");
    expect(sitemapScript).toContain('{ path: "/insonorisation"');
    expect(sitemapScript).toContain('{ path: "/en/soundproofing"');
    const router = readFileSync("src/app/router.tsx", "utf8");
    expect(router).toContain('path="/insonorisation"');
    expect(router).toContain('path="/en/soundproofing"');
  });
});
