import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HOMEOWNER_SECTIONS } from "@/data/menuTaxonomy";
import { LOCAL_SERVICE_CATEGORIES } from "@/lib/localServices/categories";
import ServiceSelector from "@/components/contractor/ServiceSelector";
import ServiceUniverseLinks from "@/components/menu/ServiceUniverseLinks";

vi.mock("@/components/contractor/UpgradeWindow", () => ({ default: () => null }));
afterEach(cleanup);

describe("existing service universe selection", () => {
  it("reuses maintenance identifiers without duplicate menu slugs", () => {
    const items = HOMEOWNER_SECTIONS.flatMap((s) => s.items);
    expect(new Set(items.map((i) => i.slug)).size).toBe(items.length);
    const maintenance = HOMEOWNER_SECTIONS.find((s) => s.slug === "maintenance");
    expect(maintenance?.items.map((i) => i.slug)).toEqual(LOCAL_SERVICE_CATEGORIES.filter((c) => c.slug !== "autre-service-residentiel").map((c) => c.slug));
    expect(HOMEOWNER_SECTIONS.slice(0, 3).map((s) => s.slug)).toEqual(["professional", "maintenance", "renovation"]);
  });
  it("keeps the same existing universe destinations in both languages", () => {
    render(<MemoryRouter><ServiceUniverseLinks lang="en" /></MemoryRouter>);
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual([
      "/owner-universe?universe=professional", "/owner-universe?universe=maintenance", "/owner-universe?universe=renovation",
    ]);
  });
  it.each(["Courtier immobilier", "Notaire", "Arpenteur-géomètre", "Évaluateur agréé", "Inspecteur en bâtiment", "Nettoyage de conduits d'air et de sécheuse", "Peinture intérieure"])("selects declared service %s through the existing selector", (service) => {
    const change = vi.fn();
    render(<ServiceSelector selection={{ primaryServices: [], secondaryServices: [] }} onSelectionChange={change} maxPrimary={2} maxSecondary={2} planName="Présence" planCode="presence" />);
    fireEvent.change(screen.getByPlaceholderText("Rechercher un service…"), { target: { value: service } });
    fireEvent.click(screen.getAllByRole("button", { name: "★ Principal" })[0]);
    expect(change).toHaveBeenCalledWith({ primaryServices: [service], secondaryServices: [] });
  });
});