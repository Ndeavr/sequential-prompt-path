/**
 * UNPRO — Premium Header (Role-Aware Navigation)
 * Adapts nav items, CTA, logo destination, and mobile menu by auth state + role.
 */

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import ThemeToggle from "@/components/ui/ThemeToggle";
import QRShareSheet from "@/components/sharing/QRShareSheet";
import unproLogo from "@/assets/unpro-logo.png";
import type { UserRole } from "@/types/navigation";

/** Mega menus only for guests — logged-in users get direct nav links */
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

  // Detect returning visitor via localStorage
  const isReturningVisitor = (() => {
    try {
      const visited = localStorage.getItem("unpro_visited");
      if (!visited) {
        localStorage.setItem("unpro_visited", "1");
        return false;
      }
      return true;
    } catch { return false; }
  })();

  // Context label for logged-in users
  const contextLabel = ctx
    ? activeRole === "contractor" && ctx.contractor?.businessName
      ? ctx.contractor.businessName
      : activeRole === "homeowner" && ctx.homeowner && ctx.homeowner.propertiesCount > 0
        ? (lang === "en" ? "My Home Passport" : "Mon Passeport Maison")
        : null
    : null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Back button — shown on all pages except home */}
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

            {/* Brand lockup — larger logo, premium presence */}
            <Link to={logoTo} className="flex items-center shrink-0 group">
              <img
                src={unproLogo}
                alt="UNPRO"
                className="h-10 sm:h-12 object-contain drop-shadow-[0_0_8px_hsl(222_100%_60%/0.15)] dark:drop-shadow-[0_0_12px_hsl(222_100%_60%/0.3)]"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5 ml-8" role="navigation" aria-label="Main">
              {isGuest ? (
                /* Guests get mega-menu dropdowns */
                guestMegaKeys.map((item) => (
                  <div
                    key={item.key}
                    className="relative"
                    onMouseEnter={() => handleMegaEnter(item.key)}
                  >
                    <button
                      className={`flex items-center gap-1 px-3.5 py-2 text-meta font-medium rounded-lg transition-all duration-200 ${
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
                /* Logged-in users get direct nav links from config */
                navItems.map((item) => {
                  const active = item.to === "/" || item.to === "/dashboard" || item.to === "/pro" || item.to === "/admin"
                    ? pathname === item.to
                    : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-meta font-medium rounded-lg transition-all duration-200 ${
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

            {/* Search */}
            <div className="flex-1 mx-4 hidden md:block max-w-lg">
              <HeaderSearch lang={lang} />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <AlexNavOrb lang={lang} />
              </div>

              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <LanguageToggle lang={lang} onChange={setLang} />
              </div>

              {/* Share QR button — all users */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setShareOpen(true)}
                aria-label="Partager"
              >
                <QrCode className="h-4 w-4" />
              </Button>

              {/* Notifications */}
              {ctx && ctx.system.notificationsCount > 0 && (
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                </Button>
              )}

              {/* Context label */}
              {contextLabel && (
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-caption font-medium text-muted-foreground truncate max-w-32">{contextLabel}</span>
                </div>
              )}

              {/* Auth */}
              {ctx ? (
                <ProfileMenu />
              ) : (
                <>
                  {/* Mobile: show contextual CTA */}
                  <Button asChild size="sm" className="rounded-full h-8 text-xs px-4 font-semibold sm:hidden">
                    <Link to={isReturningVisitor ? "/login" : "/signup"}>
                      {isReturningVisitor
                        ? (lang === "en" ? "Sign In" : "Connexion")
                        : (lang === "en" ? "Create Account" : "Créer un compte")}
                    </Link>
                  </Button>
                  {/* Desktop: keep existing */}
                  <Button asChild variant="ghost" size="sm" className="rounded-full h-9 text-meta px-4 hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                    <Link to="/login">{lang === "en" ? "Sign In" : "Connexion"}</Link>
                  </Button>
                  <SmartCTA variant="header" className="hidden sm:block" />
                </>
              )}

              {/* Mobile burger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 rounded-lg"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mega Menu panels — only for guests */}
        <AnimatePresence>
          {isGuest && activeMega && (
            <MegaMenuPanel menuKey={activeMega} lang={lang} onClose={handleMegaLeave} />
          )}
        </AnimatePresence>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileMenuOverlay lang={lang} onClose={() => setMobileOpen(false)} ctx={ctx} activeRole={activeRole} />
        )}
      </AnimatePresence>

      {/* QR Share Sheet */}
      <QRShareSheet open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
};

export default SmartHeader;

/* ─── Mobile Menu Overlay (Role-Aware) ─── */

import { useAuth } from "@/hooks/useAuth";
import { getDrawerItems, getStateActions } from "@/config/navigationConfig";
import { resolveIcon } from "./IconResolver";
import MegaMenuMobileSection from "./MobileMenu";

function MobileMenuOverlay({ lang, onClose, ctx, activeRole }: {
  lang: "fr" | "en";
  onClose: () => void;
  ctx: any;
  activeRole: string;
}) {
  const { signOut } = useAuth();
  const { setLang } = useLanguage();
  const alexVoice = useAlexVoice();

  const isGuest = !ctx;
  const drawerItems = ctx ? getDrawerItems(ctx) : [];
  const stateActions = ctx ? getStateActions(ctx).slice(0, 2) : [];

  const dashboardTo = activeRole === "admin" ? "/admin"
    : activeRole === "contractor" ? "/pro"
    : "/dashboard";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 lg:hidden"
    >
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" onClick={onClose} />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card flex flex-col"
      >
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Close + Language */}
          <div className="flex items-center justify-between mb-6">
            <span className="font-display text-lg font-bold text-foreground">UNPRO</span>
            <div className="flex items-center gap-1.5">
              <LanguageToggle lang={lang} onChange={setLang} />
              <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-lg">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <HeaderSearch lang={lang} variant="mobile" onClose={onClose} />
          </div>

          {/* ── LOGGED-IN: Role-aware quick actions + drawer ── */}
          {!isGuest ? (
            <>
              {/* Urgent state actions */}
              {stateActions.length > 0 && (
                <div className="space-y-1 mb-4">
                  <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {lang === "en" ? "Priority" : "Priorité"}
                  </p>
                  {stateActions.map((item) => {
                    const Icon = resolveIcon(item.icon);
                    return (
                      <Link
                        key={item.to + item.label}
                        to={item.to}
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/5 text-foreground font-medium text-meta"
                      >
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="flex-1">{lang === "en" && item.labelEn ? item.labelEn : item.label}</span>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.badgeVariant === "urgent" ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                          }`}>{item.badge}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Dashboard link */}
              <Link
                to={dashboardTo}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-meta mb-1"
              >
                {lang === "en" ? "Dashboard" : "Tableau de bord"}
              </Link>

              {/* Drawer items from config */}
              <div className="space-y-0.5 mb-4">
                {drawerItems.map((item) => {
                  const Icon = resolveIcon(item.icon);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-meta text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {lang === "en" && item.labelEn ? item.labelEn : item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Alex */}
              <button onClick={() => { onClose(); alexVoice.openAlex("general"); }} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground font-medium text-meta mb-4 w-full text-left">
                ✨ {lang === "en" ? "Talk to Alex" : "Parler à Alex"}
              </button>
            </>
          ) : (
            /* ── GUEST: Discovery-focused ── */
            <>
              <div className="space-y-1 mb-6">
                <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  {lang === "en" ? "Quick Actions" : "Actions rapides"}
                </p>
                <Link to="/signup" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-meta">
                  {lang === "en" ? "Get Started Free" : "Commencer gratuitement"}
                </Link>
                <button onClick={() => { onClose(); alexVoice.openAlex("general"); }} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground font-medium text-meta w-full text-left">
                  ✨ {lang === "en" ? "Talk to Alex" : "Parler à Alex"}
                </button>
                <Link to="/proprietaires/passeport-maison" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/40 text-foreground font-medium text-meta">
                  {lang === "en" ? "Create My Home Passport" : "Créer mon Passeport Maison"}
                </Link>
              </div>

              <MegaMenuMobileSection lang={lang} onClose={onClose} />
            </>
          )}

          {/* Account section */}
          <div className="border-t border-border/20 pt-4 mt-4 space-y-1">
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {lang === "en" ? "Account" : "Compte"}
            </p>
            {ctx ? (
              <>
                <Link to={activeRole === "contractor" ? "/pro/account" : "/dashboard/account"} onClick={onClose} className="block px-3 py-2.5 text-meta text-foreground rounded-lg hover:bg-muted/40">
                  {lang === "en" ? "My Account" : "Mon compte"}
                </Link>
                <button onClick={() => { signOut(); onClose(); }} className="w-full text-left px-3 py-2.5 text-meta text-destructive rounded-lg hover:bg-destructive/5">
                  {lang === "en" ? "Sign Out" : "Déconnexion"}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={onClose} className="block px-3 py-2.5 text-meta text-foreground rounded-lg hover:bg-muted/40">
                  {lang === "en" ? "Sign In" : "Connexion"}
                </Link>
                <Link to="/signup" onClick={onClose} className="block px-3 py-2.5 text-meta text-primary font-semibold rounded-lg hover:bg-primary/5">
                  {lang === "en" ? "Create Account" : "Créer un compte"}
                </Link>
              </>
            )}

            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg">
              <span className="text-meta text-foreground">{lang === "en" ? "Dark mode" : "Mode sombre"}</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
