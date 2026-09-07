import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BRAND } from "@/config/branding";

const logoComponent = readFileSync("src/components/brand/UnproLogo.tsx", "utf8");
const iconComponent = readFileSync("src/components/brand/UnproIcon.tsx", "utf8");
const indexHtml = readFileSync("index.html", "utf8");
const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as {
  icons: Array<{ src: string; sizes: string; purpose: string }>;
};

describe("official UNPRO brand contract", () => {
  it("uses only immutable official asset pointers for the canonical marks", () => {
    for (const url of [
      BRAND.logo,
      BRAND.logoWordmarkBlue,
      BRAND.logoWordmarkOnDark,
      BRAND.logoWordmarkWhite,
      BRAND.logoIconBlue,
    ]) {
      expect(url).toMatch(/^https:\/\/unpro\.ca\/__l5e\/assets-v1\/[0-9a-f-]+\/unpro-/);
    }
  });

  it("selects a complete wordmark by surface and never composes a second icon", () => {
    expect(logoComponent).toContain("BRAND.logoWordmarkOnDark");
    expect(logoComponent).toContain("BRAND.logoWordmarkWhite");
    expect(logoComponent).not.toContain("<UnproIcon");
    expect(iconComponent).not.toContain("UNPRO</span>");
  });

  it("does not repeat the global UNPRO mark inside the public contractor profile", () => {
    const publicProfile = readFileSync(
      "src/features/contractorProfile/public/ContractorPublicExperience.tsx",
      "utf8",
    );
    expect(publicProfile).not.toContain("<UnproLogo");
    expect(publicProfile).not.toContain("Profil public UNPRO");
  });

  it("declares only generated official favicon and PWA icon paths", () => {
    expect(indexHtml).not.toContain("/favicon.ico");
    expect(indexHtml).toContain('href="/favicon.png"');
    expect(manifest.icons.map((icon) => icon.src)).toEqual([
      "/favicon-192.png",
      "/favicon-512.png",
      "/apple-touch-icon.png",
      "/maskable-512.png",
    ]);
  });
});