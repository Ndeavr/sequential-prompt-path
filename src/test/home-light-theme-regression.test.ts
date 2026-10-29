import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  getThemeMode,
  setThemeMode,
} from "@/lib/theme/themeStore";

const homepageCss = readFileSync("src/styles/home-light-mode.css", "utf8");
const main = readFileSync("src/main.tsx", "utf8");
const homepage = readFileSync("src/pages/PageHomeLight.tsx", "utf8");
const header = readFileSync("src/components/navigation/SmartHeader.tsx", "utf8");
const matching = readFileSync("src/components/home-light/HomeLightSections.tsx", "utf8");
const clara = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");

afterEach(() => {
  setThemeMode("light");
  window.localStorage.removeItem(THEME_STORAGE_KEY);
});

describe("UNPRO visual mode regression: no more flash-and-stay-dark", () => {
  it("defaults new visitors to light, and keeps explicit dark/light preferences", () => {
    expect(DEFAULT_THEME_MODE).toBe("light");
    setThemeMode("dark");
    expect(getThemeMode()).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    setThemeMode("light");
    expect(getThemeMode()).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("actually repaints homepage surfaces in light mode without touching dark mode", () => {
    expect(homepageCss).toContain("html.light .home-light {");
    expect(homepageCss).toContain("html.light .home-light .home-glossy-hero {");
    expect(homepageCss).toContain("html.light .home-light .home-clara-ambient {");
    expect(homepageCss).toContain("html.light .home-light .home-hero-badge {");
    expect(homepageCss).toContain("html.light .home-light .home-clara-glass {");
    expect(homepageCss).toContain("--background: 213 100% 98%");
    expect(homepageCss).toContain("--card: 0 0% 100%");
    expect(homepageCss).not.toContain("html.dark .home-light {");
  });


  it("selects the official contrast-safe wordmark instead of forcing the dark image", () => {
    expect(header).toMatch(/isHome\\s*\\?\\s*\\([\\s\\S]*?<UnproLogo[\\s\\S]*?tone="auto"/);
    expect(header).not.toMatch(/tone="gradient"\\s+className="home-brand-wordmark"/);
  });

  it("keeps the section after Clara on the selected theme", () => {
    expect(matching).toContain('className="home-matching-section border-t');
    expect(matching).not.toContain("home-matching-section alex-immersive");
    expect(homepageCss).toContain("html.light .home-light .home-matching-section {");
    expect(homepageCss).toContain("html.light .home-light .home-matching-section nav a {");
  });

  it("increases microphone and send contrast without overriding disabled behavior", () => {
    expect(homepageCss).toContain("html.light .home-light .home-clara-mic {");
    expect(homepageCss).toContain("min-height: 44px");
    expect(homepageCss).toContain('html.light .home-light .home-clara-mic[data-voice-listening="true"]');
    expect(homepageCss).toContain("html.light .home-light .home-clara-submit:not(:disabled)");
    expect(homepageCss).toContain("html.light .home-light .home-clara-submit:disabled");
    expect(clara).toContain("disabled={busy || !canSubmit}");
  });

  it("loads the override after the original CSS and avoids a fixed browser theme-color", () => {
    expect(main.indexOf('import "./styles/home-light-mode.css"')).toBeGreaterThan(
      main.indexOf('import "./styles/alex-overlays.css"'),
    );
    expect(homepage).not.toContain('<meta name="theme-color"');
  });
});
