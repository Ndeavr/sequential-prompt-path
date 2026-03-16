/**
 * UNPRO — Mobile Bottom Navigation
 * Premium 5-tab bar with CTA, role-aware.
 */

import { Link, useLocation } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { Home, Search, Building, Sparkles, Plus } from "lucide-react";

const guestTabs = [
  { to: "/", label: "Accueil", labelEn: "Home", icon: Home },
  { to: "/problemes", label: "Explorer", labelEn: "Explore", icon: Search },
  { to: "/signup", label: "Projet", labelEn: "Project", icon: Plus, isCTA: true },
  { to: "/condo", label: "Condo", icon: Building },
  { to: "/alex", label: "Alex", icon: Sparkles },
];

const MobileBottomNav = () => {
  const { activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  // Only show for guests on public pages
  const isAppPage = pathname.startsWith("/dashboard") || pathname.startsWith("/pro") || pathname.startsWith("/admin");
  if (isAppPage) return null;

  const tabs = guestTabs;

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/";
    return pathname.startsWith(to);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/20 bg-background/95 backdrop-blur-2xl safe-area-bottom" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.to);
          const Icon = tab.icon;

          if (tab.isCTA) {
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold text-primary mt-0.5">
                  {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-lg transition-colors ${
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
