import { describe, expect, it } from "vitest";
import { parseTannesChoice, tannesContractorPath, tannesHomeownerPath } from "@/data/tannesCampaign";

const search = "?utm_source=facebook&utm_campaign=tannes-nov&choix=entrepreneur&email=x%40y.ca";

describe("/tannes destinations", () => {
  it("sends homeowners to the existing Clara homeowner campaign with UTMs only", () => {
    const url = new URL(tannesHomeownerPath(search), "https://unpro.test");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.getAll("intent")).toEqual(["economies-100m"]);
    expect(url.searchParams.get("utm_source")).toBe("facebook");
    expect(url.searchParams.get("utm_campaign")).toBe("tannes-nov");
    expect(url.searchParams.has("choix")).toBe(false);
    expect(url.searchParams.has("email")).toBe(false);
  });

  it("sends contractors to the canonical profile entry with language and UTMs", () => {
    const url = new URL(tannesContractorPath(search, "en"), "https://unpro.test");
    expect(url.pathname).toBe("/entrepreneurs/profil");
    expect(url.searchParams.get("entry")).toBe("profile");
    expect(url.searchParams.get("lang")).toBe("en");
    expect(url.searchParams.get("utm_source")).toBe("facebook");
    expect(url.searchParams.has("choix")).toBe(false);
  });

  it("tags untracked visits with the campaign name", () => {
    expect(new URL(tannesHomeownerPath(""), "https://unpro.test").searchParams.get("utm_campaign")).toBe("tannes");
  });

  it("accepts only the two persona values", () => {
    expect(parseTannesChoice("proprietaire")).toBe("homeowner");
    expect(parseTannesChoice("entrepreneur")).toBe("contractor");
    expect(parseTannesChoice("admin")).toBeNull();
  });
});
