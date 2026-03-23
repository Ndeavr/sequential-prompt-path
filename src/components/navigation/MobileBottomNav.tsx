/**
 * UNPRO — Mobile Bottom Navigation (Role-Aware)
 * Uses mobileTabsByRole config. Shows for all users on mobile.
 * The "Alex" tab triggers the voice orb instead of navigating.
 */

import { Link, useLocation } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { mobileTabsByRole } from "@/config/navigationConfig";
import { resolveIcon } from "./IconResolver";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import type { UserRole } from "@/types/navigation";

const MobileBottomNav = () => {
  const { activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const { openAlex } = useAlexVoice();

  // Hide on specific full-screen pages
  const hiddenPaths = ["/alex", "/login", "/signup", "/start"];
  if (hiddenPaths.some((p) => pathname === p)) return null;

  const tabs = mobileTabsByRole[(activeRole as UserRole | "guest")] || mobileTabsByRole.guest;

  const isActive = (to: string) => {
    if (to === "/" || to === "/dashboard" || to === "/pro" || to === "/admin") return pathname === to;
    return pathname.startsWith(to);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/20 bg-background/95 backdrop-blur-2xl safe-area-bottom" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.to);
          const Icon = resolveIcon(tab.icon);
          const isAlexTab = tab.label === "Alex";

          if (isAlexTab) {
            return (
              <button
                key="alex-voice"
                onClick={() => openAlex("general")}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-lg transition-colors text-muted-foreground"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">
                  {lang === "en" && tab.labelEn ? tab.labelEn : tab.label}
                </span>
              </button>
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
              {tab.badge && (
                <span className="absolute -top-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
