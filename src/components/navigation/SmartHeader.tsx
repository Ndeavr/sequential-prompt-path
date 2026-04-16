/**
 * UNPRO — Premium Header (Dark Sharp) — Intent-Based 4-Zone Layout
 * Zone 1: Brand | Zone 2: Main Nav | Zone 3: Contextual Actions | Zone 4: User State
 */

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { headerNavByRole } from "@/config/navigationConfig";
import { Menu, X, Bell, ChevronDown, QrCode, ArrowLeft } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import AlexNavOrb from "./AlexNavOrb";
import HeaderSearch from "./HeaderSearch";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import MegaMenuPanel from "./MegaMenu";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import SwitchLanguagePillAnimated from "@/components/ui/SwitchLanguagePillAnimated";
import SmartCTA from "@/components/cta/SmartCTA";
import QRShareSheet from "@/components/sharing/QRShareSheet";
import MenuQuickActionsContextual from "./MenuQuickActionsContextual";
import DrawerNavigationMobileIntent from "./DrawerNavigationMobileIntent";
import unproLogoWordmark from "@/assets/unpro-logo-wordmark.png";
import unproLogoIcon from "@/assets/unpro-logo.png";
import unproLogoHouse from "@/assets/unpro-logo-house.png";
import type { UserRole } from "@/types/navigation";

const guestMegaKeys = [
  { key: "maison", label: "Maison", labelEn: "Home" },
  { key: "entreprises", label: "Entreprises", labelEn: "Business" },
  { key: "condo", label: "Condo", labelEn: "Condo" },
  { key: "explorer", label: "Explorer", labelEn: "Explore" },
] as const;

function getLogoDestination(role: UserRole | "guest"): string {
  switch (role) {
    case "homeowner": return "/dashboard";
    case "contractor": return "/pro";
    case "admin": return "/admin";
    case "partner": return "/dashboard";
    default: return "/";
  }
}

const SmartHeader = () => {
  const { ctx, activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const { lang, setLang } = useLanguage();

  const handleMegaEnter = useCallback((key: string) => setActiveMega(key), []);
  const handleMegaLeave = useCallback(() => setActiveMega(null), []);

  const isGuest = !ctx;
  const isHome = pathname === "/";
  const logoTo = getLogoDestination(activeRole as UserRole | "guest");
  const navItems = headerNavByRole[activeRole as UserRole | "guest"] || headerNavByRole.guest;

  const contextLabel = ctx
    ? activeRole === "contractor" && ctx.contractor?.businessName
      ? ctx.contractor.businessName
      : activeRole === "homeowner" && ctx.homeowner && ctx.homeowner.propertiesCount > 0
        ? (lang === "en" ? "My Home Passport" : "Mon Passeport Maison")
        : null
    : null;

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{
          background: "hsl(220 40% 6% / 0.82)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          borderBottom: "1px solid hsl(0 0% 100% / 0.06)",
        }}
      >
        <div className="mx-auto max-w-7xl px-1 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-14 lg:h-16">
            {/* Back button */}
            {!isHome && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground mr-0.5"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate("/");
                  }
                }}
                aria-label="Retour"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Zone 1 — Brand */}
            <Link to={logoTo} className="flex items-center shrink-0 group p-0 m-0" style={{ minWidth: "fit-content" }}>
              <img
                src={isHome ? unproLogoWordmark : unproLogoHouse}
                alt="UNPRO"
                className={`${isHome ? "h-7 sm:h-8 lg:h-9" : "h-9 sm:h-10 lg:h-11"} w-auto transition-all duration-300 group-hover:scale-105`}
                draggable={false}
              />
            </Link>

            {/* Zone 2 — Desktop main nav */}
            <nav className="hidden lg:flex items-center gap-0.5 ml-6" role="navigation" aria-label="Main">
              {isGuest ? (
                guestMegaKeys.map((item) => (
                  <div
                    key={item.key}
                    className="relative"
                    onMouseEnter={() => handleMegaEnter(item.key)}
                  >
                    <button
                      className={`flex items-center gap-1 px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                        activeMega === item.key
                          ? "text-foreground bg-muted/50"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                      aria-expanded={activeMega === item.key}
                      aria-haspopup="true"
                    >
                      {lang === "en" && item.labelEn ? item.labelEn : item.label}
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${activeMega === item.key ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                ))
              ) : (
                navItems.map((item) => {
                  const active = item.to === "/" || item.to === "/dashboard" || item.to === "/pro" || item.to === "/admin"
                    ? pathname === item.to
                    : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                        active
                          ? "text-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {lang === "en" && item.labelEn ? item.labelEn : item.label}
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })
              )}
            </nav>

            {/* Zone 3 — Desktop contextual actions */}
            <MenuQuickActionsContextual variant="header" />

            {/* Search */}
            <div className="flex-1 mx-4 hidden md:block max-w-lg">
              <HeaderSearch lang={lang} />
            </div>

            {/* Zone 4 — Right actions / User state */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:block">
                <AlexNavOrb lang={lang} />
              </div>

              {/* Language */}
              <div className="sm:hidden">
                <SwitchLanguagePillAnimated lang={lang} onChange={setLang} />
              </div>
              <div className="hidden sm:block">
                <LanguageToggle lang={lang} onChange={setLang} />
              </div>

              {/* Share QR */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setShareOpen(true)}
                aria-label="Partager"
              >
                <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>

              {/* Notifications */}
              {ctx && ctx.system.notificationsCount > 0 && (
                <Button variant="ghost" size="icon" className="relative h-7 w-7 sm:h-9 sm:w-9 rounded-lg text-muted-foreground hover:text-foreground">
                  <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                </Button>
              )}

              {/* Context label */}
              {contextLabel && (
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-[11px] font-medium text-muted-foreground truncate max-w-32">{contextLabel}</span>
                </div>
              )}

              {/* Auth */}
              {ctx ? (
                <ProfileMenu />
              ) : (
                <>
                  <Button asChild size="sm" className="rounded-full h-7 text-[11px] px-3 font-bold sm:hidden btn-liquid-metal border-0">
                    <Link to="/role">
                      {lang === "en" ? "Sign In" : "Connexion"}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="rounded-full h-9 text-[13px] px-4 hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                    <Link to="/role">{lang === "en" ? "Sign In" : "Connexion"}</Link>
                  </Button>
                  <SmartCTA variant="header" className="hidden sm:block" />
                </>
              )}

              {/* Mobile burger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 rounded-lg"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mega Menu panels */}
        <AnimatePresence>
          {isGuest && activeMega && (
            <MegaMenuPanel menuKey={activeMega} lang={lang} onClose={handleMegaLeave} />
          )}
        </AnimatePresence>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <DrawerNavigationMobileIntent
            onClose={() => setMobileOpen(false)}
            ctx={ctx}
            activeRole={activeRole}
          />
        )}
      </AnimatePresence>

      {/* QR Share Sheet */}
      <QRShareSheet open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
};

export default SmartHeader;
