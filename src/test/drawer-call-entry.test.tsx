import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import DrawerNavigationMobileIntent from "@/components/navigation/DrawerNavigationMobileIntent";

const state = vi.hoisted(() => ({ lang: "fr" as "fr" | "en" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock("@/hooks/useScrollLock", () => ({ useScrollLock: () => {} }));
vi.mock("@/contexts/AlexVoiceContext", () => ({ useAlexVoice: () => ({ openAlex: vi.fn() }) }));
vi.mock("@/components/ui/LanguageToggle", () => ({
  default: () => null,
  useLanguage: () => ({ lang: state.lang, setLang: vi.fn() }),
}));
vi.mock("@/components/theme/ThemeSwitcher", () => ({ default: () => null }));
vi.mock("@/config/navigationConfig", () => ({ getDrawerSections: () => [] }));
vi.mock("@/components/navigation/IconResolver", () => ({ resolveIcon: () => () => null }));
vi.mock("@/components/navigation/BadgePersonaActiveNavigation", () => ({ default: () => null }));
vi.mock("@/components/navigation/MenuRoleSwitcherUniversal", () => ({ default: () => null }));
vi.mock("@/components/navigation/HeaderSearch", () => ({ default: () => null }));
vi.mock("@/components/navigation/MobileMenu", () => ({ default: () => null }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));

afterEach(() => {
  cleanup();
  state.lang = "fr";
});

function renderDrawer(ctx: unknown) {
  return render(
    <MemoryRouter>
      <DrawerNavigationMobileIntent onClose={() => {}} ctx={ctx} activeRole={ctx ? "homeowner" : "guest"} />
    </MemoryRouter>
  );
}

describe("mobile drawer public call entry", () => {
  it("shows exactly one call entry for a guest, with the public number", () => {
    renderDrawer(null);
    const call = screen.getAllByRole("link", { name: "Appeler UNPRO au 450-328-6776" });
    expect(call).toHaveLength(1);
    expect(call[0]).toHaveAttribute("href", "tel:+14503286776");
    expect(call[0]).toHaveTextContent("Appeler UNPRO");
  });

  it("shows the same single entry when signed in and adapts to EN", () => {
    state.lang = "en";
    renderDrawer({ id: "u1" });
    const call = screen.getAllByRole("link", { name: "Call UNPRO at 450-328-6776" });
    expect(call).toHaveLength(1);
    expect(call[0]).toHaveAttribute("href", "tel:+14503286776");
    expect(call[0]).toHaveTextContent("Call UNPRO");
  });
});
