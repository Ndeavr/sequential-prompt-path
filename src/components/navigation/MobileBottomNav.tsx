/**
 * UNPRO — Mobile Bottom Navigation
 * 5 tabs max, role-aware, always visible on mobile.
 */

import { Link, useLocation } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { mobileTabsByRole } from "@/config/navigationConfig";
import { resolveIcon } from "./IconResolver";
import { useLanguage } from "@/components/ui/LanguageToggle";

const MobileBottomNav = () => {
  const { activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  const tabs = mobileTabsByRole[activeRole] || mobileTabsByRole.guest;

  const isActive = (to: string) => {
    if (to === "/" || to === "/dashboard" || to === "/pro" || to === "/admin") return pathname === to;
    return pathname.startsWith(to);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-background/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {tabs.map((tab) => {
          const Icon = resolveIcon(tab.icon);
          const active = isActive(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium leading-none">
                {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
