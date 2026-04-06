/**
 * UNPRO — Mobile Bottom Navigation — Dark Sharp Compact
 * Thinner, cleaner, controlled glow.
 */

import { Link, useLocation } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { mobileTabsByRole } from "@/config/navigationConfig";
import { mobileTabsByRole } from "@/config/navigationConfig";
import { resolveIcon } from "./IconResolver";
import AlexBottomSheetLauncherUNPRO from "./AlexBottomSheetLauncherUNPRO";
import type { UserRole } from "@/types/navigation";

const MobileBottomNav = () => {
  const { activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { openAlex } = useAlexVoice();

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
      className="lg:hidden fixed bottom-2 left-2 right-2 z-40 rounded-2xl safe-area-bottom"
      aria-label="Mobile navigation"
      style={{
        background: "hsl(220 40% 6% / 0.78)",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        border: "1px solid hsl(0 0% 100% / 0.06)",
        boxShadow: "0 -4px 24px -4px hsl(222 100% 55% / 0.08), 0 8px 32px -8px hsl(228 40% 2% / 0.6)",
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
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? "text-primary" : ""}`} />
              <span className="text-[9px] font-medium leading-none">
                {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
              </span>
              {active && (
                <span className="h-0.5 w-3 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}

        {/* Center Alex Orb — slightly smaller */}
        <AlexBottomSheetLauncherUNPRO />

        {rightTabs.map((tab) => {
          const active = isActive(tab.to);
          const Icon = resolveIcon(tab.icon);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? "text-primary" : ""}`} />
              <span className="text-[9px] font-medium leading-none">
                {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
              </span>
              {active && (
                <span className="h-0.5 w-3 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
