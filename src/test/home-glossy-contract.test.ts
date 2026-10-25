import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const hero = read("src/components/home-light/HeroHomeownerLight.tsx");
const clara = read("src/components/home-light/ClaraConversationBox.tsx");
const page = read("src/pages/PageHomeLight.tsx");
const layout = read("src/layouts/MainLayout.tsx");
const header = read("src/components/navigation/SmartHeader.tsx");
const drawer = read("src/components/navigation/DrawerNavigationMobileIntent.tsx");
const css = read("src/index.css");
const theme = read("src/lib/theme/themeStore.ts");
const shell = read("index.html");

describe("premium blue/cyan homepage contract", () => {
  it("reuses ONE Clara conversation with its mobile-active callback", () => {
    expect(hero).toContain("<ClaraConversationBox surface=\"home\" onConversationActiveChange={setIsConversationActive} />");
    expect(hero).toContain('id="clara-conversation"');
    expect(page).toContain("<HeroHomeownerLight />");
    expect(clara).toContain("/functions/v1/alex-chat");
    expect(clara).toContain("enqueueMedia(files)");
    expect(clara).toContain("PromptInput");
    expect(clara).toContain("clara:conversation-active");
    expect(layout).toContain("{!isLightHome && <MobileBottomNav />}");
  });

  it("uses local photo assets and real destinations, not imaginary ratings", () => {
    const sections = read("src/components/home-light/HomeLightSections.tsx");
    expect(hero).toContain('hero-house.jpg');
    expect(hero).toContain("Un projet de ");
    expect(hero).toContain("rénovation");
    expect(hero).toContain('href="#clara-conversation"');
    expect(hero).toContain('href="#comment-ca-marche"');
    expect(sections).toContain('ice-dam-roof.jpg');
    expect(sections).toContain('hero-plomberie.jpg');
    expect(sections).toContain('to="/score-maison"');
    expect(sections).toContain('to="/entrepreneur"');
    expect(sections).not.toContain("78/100");
    expect(sections).not.toContain("4.8/5");
  });

  it("makes light the new-visitor default without overwriting stored dark or auto", () => {
    expect(theme).toContain('DEFAULT_THEME_MODE: ThemeMode = "light"');
    expect(shell).toContain('localStorage.getItem("unpro-theme") || "light"');
    expect(theme).toContain('v === "light" || v === "dark" || v === "system"');
    expect(css).toContain(".dark .home-light {");
    expect(css).toContain(".home-light .unpro-home-hero");
    expect(page).not.toContain('<meta name="theme-color"');
  });

  it("keeps the official logo and actual mobile navigation", () => {
    expect(header).toContain("<UnproLogo");
    expect(header).toContain('tone="auto"');
    expect(header).toContain("home-brand-wordmark");
    expect(header).toContain("PUBLIC_PHONE.tel");
    expect(header).toContain("<ThemeSwitcher");
    expect(drawer).toContain("<ThemeSwitcher");
    expect(drawer).toContain("PUBLIC_PHONE.tel");
  });
});
