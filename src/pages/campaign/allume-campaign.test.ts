import { describe, expect, it } from "vitest";
import { ALLUME_COPY, allumeContractorPath, parseAllumeCity, parseAllumeService } from "@/data/allumeCampaign";

describe("allume campaign destination", () => {
  it("routes to the canonical contractor Clara entry with campaign, city and service", () => {
    const url = new URL(allumeContractorPath("?ville=laval&utm_source=email", "lumieres-de-noel"), "https://unpro.ca");
    expect(url.pathname).toBe("/entrepreneurs/profil");
    expect(url.searchParams.get("entry")).toBe("profile");
    expect(url.searchParams.get("utm_campaign")).toBe("allume_saisonnier_2026");
    expect(url.searchParams.get("utm_source")).toBe("email");
    expect(url.searchParams.get("ville")).toBe("Laval");
    expect(url.searchParams.get("metier")).toBe("lumieres-de-noel");
  });

  it("drops unknown cities, services and any other parameter", () => {
    const url = new URL(allumeContractorPath("?ville=Paris&email=x@y.ca&t=secret", "piscine"), "https://unpro.ca");
    expect(url.searchParams.get("ville")).toBeNull();
    expect(url.searchParams.get("metier")).toBeNull();
    expect(url.searchParams.get("email")).toBeNull();
    expect(url.searchParams.get("t")).toBeNull();
    expect(parseAllumeCity("Sainte-Thérèse")).toBe("Sainte-Thérèse");
    expect(parseAllumeService("abris-temporaires")).toBe("abris-temporaires");
  });

  it("does not show an unbacked 5-per-city offer or a video", () => {
    const text = JSON.stringify(ALLUME_COPY).toLowerCase();
    expect(text).not.toContain("5 entreprises");
    expect(text).not.toContain("vidéo");
  });
});
