/**
 * UNPRO — Mobile Bottom Navigation — Cinematic Floating Glass
 * Role-aware with center Alex orb.
 */

import { Link, useLocation } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { mobileTabsByRole } from "@/config/navigationConfig";
import { resolveIcon } from "./IconResolver";
import AlexBottomSheetLauncherUNPRO from "./AlexBottomSheetLauncherUNPRO";
import type { UserRole } from "@/types/navigation";

const MobileBottomNav = () => {
  const { activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  const hiddenPaths = ["/alex", "/login", "/signup", "/start"];
  if (hiddenPaths.some((p) => pathname === p)) return null;

  const tabs = mobileTabsByRole[(activeRole as UserRole | "guest")] || mobileTabsByRole.guest;

  const isActive = (to: string) => {
    if (to === "/" || to === "/dashboard" || to === "/pro" || to === "/admin") return pathname === to;
    return pathname.startsWith(to);
  };

  const isAlexTab = (tab: typeof tabs[0]) => tab.label === "Alex";
  const regularTabs = tabs.filter(t => !isAlexTab(t));
  const leftTabs = regularTabs.slice(0, 2);
  const rightTabs = regularTabs.slice(2, 4);

  return (
    <nav
      className="lg:hidden fixed bottom-3 left-3 right-3 z-40 rounded-2xl safe-area-bottom"
      aria-label="Mobile navigation"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(28px) saturate(1.8)",
        WebkitBackdropFilter: "blur(28px) saturate(1.8)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-lg), var(--shadow-glow)",
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {leftTabs.map((tab) => {
          const active = isActive(tab.to);
          const Icon = resolveIcon(tab.icon);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary drop-shadow-[0_0_8px_hsl(222_100%_65%/0.4)]" : ""}`} />
              <span className="text-[10px] font-medium leading-none">
                {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
              </span>
              {active && (
                <span className="h-1 w-1 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}

        {/* Center Alex Orb */}
        <AlexBottomSheetLauncherUNPRO />

        {rightTabs.map((tab) => {
          const active = isActive(tab.to);
          const Icon = resolveIcon(tab.icon);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary drop-shadow-[0_0_8px_hsl(222_100%_65%/0.4)]" : ""}`} />
              <span className="text-[10px] font-medium leading-none">
                {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
              </span>
              {active && (
                <span className="h-1 w-1 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
