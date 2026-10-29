/**
 * UNPRO — Mobile Bottom Navigation — Dark Sharp Compact
 * Thinner, cleaner, controlled glow.
 */

import { Link, useLocation } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { mobileTabsByRole } from "@/config/navigationConfig";
import { resolveIcon } from "./IconResolver";
import AlexBottomSheetLauncherUNPRO from "./AlexBottomSheetLauncherUNPRO";
import { useThemeToggle } from "@/hooks/useThemeToggle";
import type { UserRole } from "@/types/navigation";

const MobileBottomNav = () => {
  const { activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const { isDark } = useThemeToggle();
  // Legible foreground on both mobile dock surfaces, independent of page tokens.
  const tabColor = (active: boolean) =>
    active ? (isDark ? "#93C5FD" : "#1D4ED8") : (isDark ? "#E5ECF7" : "#334155");

  const hiddenPaths = ["/alex", "/login", "/signup", "/start"];
  if (hiddenPaths.some((p) => pathname === p)) return null;

  // Runtime singleton guard — if BottomDockGlass is already mounted, defer
  // to it and render nothing. Prevents two docks stacking.
  if (typeof document !== "undefined" && document.querySelector('[data-bottom-dock="glass"]')) {
    return null;
  }

  const tabs = mobileTabsByRole[(activeRole as UserRole | "guest")] || mobileTabsByRole.guest;

  const isActive = (to: string) => {
    if (to === "/" || to === "/dashboard" || to === "/pro" || to === "/admin") return pathname === to;
    return pathname.startsWith(to);
  };

  const isAlexTab = (tab: typeof tabs[0]) => tab.label === "Clara";
  const regularTabs = tabs.filter(t => !isAlexTab(t));
  const leftTabs = regularTabs.slice(0, 2);
  const rightTabs = regularTabs.slice(2, 4);

  return (
    <nav
      data-bottom-dock="nav"
      className="lg:hidden fixed bottom-2 left-2 right-2 z-40 rounded-2xl safe-area-bottom"
      aria-label="Mobile navigation"
      style={{
        background: isDark ? "rgba(10, 18, 35, 0.96)" : "rgba(250, 252, 255, 0.96)",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        border: isDark ? "1px solid rgba(170, 197, 245, 0.22)" : "1px solid rgba(44, 75, 120, 0.18)",
        boxShadow: isDark
          ? "0 -4px 24px -4px rgba(69, 139, 255, 0.15), 0 8px 32px -8px rgba(0, 0, 0, 0.68)"
          : "0 10px 34px -12px rgba(15, 45, 90, 0.24), 0 -1px 0 rgba(255, 255, 255, 0.9)",
      }}
    >
      <div className="flex items-center justify-around h-14 px-1">
        {leftTabs.map((tab) => {
          const active = isActive(tab.to);
          const Icon = resolveIcon(tab.icon);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center justify-center gap-1 flex-1 min-h-14 py-1.5 rounded-xl transition-colors duration-200"
              style={{ color: tabColor(active) }}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-[20px] w-[20px]" />
              <span className="text-[11px] font-semibold leading-tight text-center">
                {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
              </span>
              {active && (
                <span className="h-0.5 w-4 rounded-full mt-0.5" style={{ backgroundColor: tabColor(true) }} />
              )}
            </Link>
          );
        })}

        {/* Center Clara Orb — slightly smaller */}
        <AlexBottomSheetLauncherUNPRO />

        {rightTabs.map((tab) => {
          const active = isActive(tab.to);
          const Icon = resolveIcon(tab.icon);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center justify-center gap-1 flex-1 min-h-14 py-1.5 rounded-xl transition-colors duration-200"
              style={{ color: tabColor(active) }}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-[20px] w-[20px]" />
              <span className="text-[11px] font-semibold leading-tight text-center">
                {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
              </span>
              {active && (
                <span className="h-0.5 w-4 rounded-full mt-0.5" style={{ backgroundColor: tabColor(true) }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
