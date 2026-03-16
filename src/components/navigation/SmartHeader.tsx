/**
 * UNPRO — Premium Header (Unicorn Proptech)
 * Stripe/Linear inspired. MegaMenus, Alex Orb, Smart Search, dynamic CTA.
 */

import { Link, useLocation } from "react-router-dom";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { Menu, X, Bell, ChevronDown } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import AlexNavOrb from "./AlexNavOrb";
import HeaderSearch from "./HeaderSearch";
import MegaMenuPanel from "./MegaMenu";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import SmartCTA from "@/components/cta/SmartCTA";
import unproLogo from "@/assets/unpro-logo.png";

const mainNavItems = [
  { key: "maison", label: "Maison", labelEn: "Home", megaKey: "maison" },
  { key: "entreprises", label: "Entreprises", labelEn: "Business", megaKey: "entreprises" },
  { key: "condo", label: "Condo", megaKey: "condo" },
  { key: "explorer", label: "Explorer", labelEn: "Explore", megaKey: "explorer" },
] as const;

const SmartHeader = () => {
  const { ctx, activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const { lang, setLang } = useLanguage();

  const handleMegaEnter = useCallback((key: string) => setActiveMega(key), []);
  const handleMegaLeave = useCallback(() => setActiveMega(null), []);

  // Context label
  const contextLabel = ctx
    ? activeRole === "contractor" && ctx.contractor?.businessName
      ? ctx.contractor.businessName
      : activeRole === "homeowner" && ctx.homeowner && ctx.homeowner.propertiesCount > 0
        ? (lang === "en" ? "My Home Passport" : "Mon Passeport Maison")
        : null
    : null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <img
                src={unproLogo}
                alt="UNPRO"
                className="h-9 w-9 rounded-lg object-contain"
                style={{ filter: "brightness(0) saturate(100%) invert(28%) sepia(92%) saturate(1800%) hue-rotate(213deg) brightness(101%) contrast(101%)" }}
              />
              <span className="font-display text-xl font-bold text-foreground tracking-tight">UNPRO</span>
            </Link>

            {/* Center left: Nav items with mega menus */}
            <nav className="hidden lg:flex items-center gap-0.5 ml-8" role="navigation" aria-label="Main">
              {mainNavItems.map((item) => (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={() => handleMegaEnter(item.megaKey)}
                >
                  <button
                    className={`flex items-center gap-1 px-3.5 py-2 text-meta font-medium rounded-lg transition-all duration-200 ${
                      activeMega === item.megaKey
                        ? "text-foreground bg-muted/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                    aria-expanded={activeMega === item.megaKey}
                    aria-haspopup="true"
                  >
                    {lang === "en" && item.labelEn ? item.labelEn : item.label}
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${activeMega === item.megaKey ? "rotate-180" : ""}`} />
                  </button>
                </div>
              ))}
            </nav>

            {/* Center: Search */}
            <div className="flex-1 mx-4 hidden md:block max-w-lg">
              <HeaderSearch lang={lang} />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Alex orb */}
              <div className="hidden sm:block">
                <AlexNavOrb lang={lang} />
              </div>

              {/* Language */}
              <div className="hidden sm:block">
                <LanguageToggle lang={lang} onChange={setLang} />
              </div>

              {/* Notifications */}
              {ctx && ctx.system.notificationsCount > 0 && (
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                </Button>
              )}

              {/* Context label */}
              {contextLabel && (
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-caption font-medium text-muted-foreground truncate max-w-32">{contextLabel}</span>
                </div>
              )}

              {/* Auth */}
              {ctx ? (
                <ProfileMenu />
              ) : (
                <>
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

        {/* Mega Menu panels */}
        <AnimatePresence>
          {activeMega && (
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
    </>
  );
};

export default SmartHeader;

/* ─── Mobile Menu Overlay ─── */

import { useAuth } from "@/hooks/useAuth";
import MegaMenuMobileSection from "./MobileMenu";

function MobileMenuOverlay({ lang, onClose, ctx, activeRole }: {
  lang: "fr" | "en";
  onClose: () => void;
  ctx: any;
  activeRole: string;
}) {
  const { signOut } = useAuth();
  const { setLang } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 lg:hidden"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l border-border/20 overflow-y-auto"
      >
        <div className="p-5">
          {/* Close */}
          <div className="flex items-center justify-between mb-6">
            <span className="font-display text-lg font-bold text-foreground">UNPRO</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-lg">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <HeaderSearch lang={lang} variant="mobile" onClose={onClose} />
          </div>

          {/* Quick actions */}
          <div className="space-y-1 mb-6">
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {lang === "en" ? "Quick Actions" : "Actions rapides"}
            </p>
            <Link to="/signup" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-meta">
              {lang === "en" ? "Create My Project" : "Créer mon projet"}
            </Link>
            <Link to="/alex" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground font-medium text-meta border border-primary/20">
              ✨ {lang === "en" ? "Talk to Alex" : "Parler à Alex"}
            </Link>
            <Link to="/proprietaires/passeport-maison" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/40 text-foreground font-medium text-meta">
              {lang === "en" ? "Create My Home Passport" : "Créer mon Passeport Maison"}
            </Link>
          </div>

          {/* Navigation sections */}
          <MegaMenuMobileSection lang={lang} onClose={onClose} />

          {/* Account */}
          <div className="border-t border-border/20 pt-4 mt-4 space-y-1">
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {lang === "en" ? "Account" : "Compte"}
            </p>
            {ctx ? (
              <>
                <Link to="/dashboard" onClick={onClose} className="block px-3 py-2.5 text-meta text-foreground rounded-lg hover:bg-muted/40">
                  {lang === "en" ? "Dashboard" : "Tableau de bord"}
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

            {/* Language */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-meta text-muted-foreground">
                {lang === "en" ? "Language" : "Langue"}
              </span>
              <LanguageToggle lang={lang} onChange={setLang} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
