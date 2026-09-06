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
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";
import SmartCTA from "@/components/cta/SmartCTA";
import QRShareSheet from "@/components/sharing/QRShareSheet";
import MenuQuickActionsContextual from "./MenuQuickActionsContextual";
import DrawerNavigationMobileIntent from "./DrawerNavigationMobileIntent";
import UnproLogo from "@/components/brand/UnproLogo";
import UnproIcon from "@/components/brand/UnproIcon";
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
    // Admin = supervisor — logo lands on user dashboard so admin can browse the app.
    case "admin": return "/dashboard";
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
  const { openAlex } = useAlexVoice();

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
        className="glass-nav sticky top-0 z-[60] pointer-events-auto"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 0px)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 py-1 sm:h-14 lg:h-14">

            {/* Back button */}
            {!isHome && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground mr-0.5"
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
            <Link to={logoTo} className="flex items-center shrink-0 group p-0 m-0 -ml-1 sm:ml-0" style={{ minWidth: "fit-content" }}>
              <UnproLogo
                unsized
                tone={isHome ? "light" : "auto"}
                className="hidden min-[360px]:block h-[29px] sm:h-[31px] md:h-[38px] w-auto max-w-[128px] sm:max-w-none min-h-0 transition-transform duration-300 group-hover:-translate-y-0.5"
              />
              <UnproIcon
                unsized
                shape="bare"
                tone="auto"
                className="block min-[360px]:hidden h-[29px] w-auto transition-transform duration-300 group-hover:-translate-y-0.5"
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
                      key={`${item.to}-${item.label}`}
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
            <div className="flex-1 mx-4 hidden lg:block max-w-lg">
              <HeaderSearch lang={lang} />
            </div>

            {/* Zone 4 — Right actions / User state */}
            <div className="flex shrink-0 items-center gap-0 sm:gap-1.5">
              <div className="hidden lg:block">
                <AlexNavOrb lang={lang} />
              </div>

              {/* Desktop only — mobile language and theme controls live in the drawer. */}
              <div className="hidden lg:block">
                <LanguageToggle lang={lang} onChange={setLang} />
              </div>

              {/* Desktop only — Clair / Auto / Sombre */}
              <ThemeSwitcher className="hidden lg:inline-flex" />

              {/* Notifications — always available from the compact top bar. */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 lg:h-9 lg:w-9 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => navigate(ctx ? "/dashboard/notifications" : "/login")}
                aria-label={lang === "en" ? "Notifications" : "Notifications"}
              >
                <Bell className="h-4 w-4" />
                {ctx && ctx.system.notificationsCount > 0 && (
                  <span className="absolute top-2 right-2 lg:top-1 lg:right-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Button>

              {/* Share QR */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 lg:h-9 lg:w-9 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setShareOpen(true)}
                aria-label={lang === "en" ? "Share QR code" : "Partager par code QR"}
              >
                <QrCode className="h-4 w-4" />
              </Button>

              {/* Context label */}
              {contextLabel && (
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-[11px] font-medium text-muted-foreground truncate max-w-32">{contextLabel}</span>
                </div>
              )}

              {/* Auth */}
              {ctx ? (
                <div className="hidden lg:block">
                  <ProfileMenu />
                </div>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="rounded-full h-9 text-[13px] px-3 hidden md:inline-flex text-muted-foreground hover:text-foreground">
                    <Link to="/entrepreneur">{lang === "en" ? "Contractors" : "Entrepreneurs"}</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="rounded-full h-9 text-[13px] px-4 hidden lg:inline-flex text-muted-foreground hover:text-foreground">
                    <Link to="/role">{lang === "en" ? "Sign In" : "Connexion"}</Link>
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full h-8 text-xs px-4 font-semibold hidden lg:inline-flex"
                    onClick={() => openAlex("homeowner")}
                  >
                    {lang === "en" ? "Find my PRO" : "Trouver mon PRO"}
                  </Button>
                </>
              )}

              {/* Mobile burger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-10 w-10 rounded-lg"
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
            logoTone={isHome ? "light" : "auto"}
          />
        )}
      </AnimatePresence>

      {/* QR Share Sheet */}
      <QRShareSheet open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
};

export default SmartHeader;
