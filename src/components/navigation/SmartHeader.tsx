/**
 * UNPRO — Smart Header Navigation
 * Adapts to role, shows badges, sub-nav, and profile menu.
 */

import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { headerNavByRole } from "@/config/navigationConfig";
import { resolveIcon, Menu, X, Bell, Home as HomeIcon } from "./IconResolver";
import ProfileMenu from "./ProfileMenu";
import MobileDrawer from "./MobileDrawer";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import type { NavItem } from "@/types/navigation";
import unproLogo from "@/assets/unpro-logo.png";

const NavBadge = ({ item }: { item: NavItem }) => {
  if (!item.badge) return null;
  const colors =
    item.badgeVariant === "urgent"
      ? "bg-destructive text-destructive-foreground"
      : item.badgeVariant === "warning"
        ? "bg-warning text-warning-foreground"
        : "bg-primary text-primary-foreground";
  return (
    <span className={`ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${colors}`}>
      {typeof item.badge === "number" ? item.badge : "!"}
    </span>
  );
};

const SmartHeader = () => {
  const { ctx, activeRole } = useNavigationContext();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang } = useLanguage();

  const navItems = headerNavByRole[activeRole] || headerNavByRole.guest;

  const isActive = (to: string) => {
    if (to === "/" || to === "/dashboard" || to === "/pro" || to === "/admin") return pathname === to;
    return pathname.startsWith(to);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <img src={unproLogo} alt="UNPRO" className="h-10 w-10 rounded-xl object-contain" style={{ filter: "brightness(0) saturate(100%) invert(28%) sepia(92%) saturate(1800%) hue-rotate(213deg) brightness(101%) contrast(101%)" }} />
          <span className="font-display text-sm font-bold text-foreground tracking-tight">UNPRO</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => {
            const Icon = resolveIcon(item.icon);
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-meta font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? "text-foreground bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {item.icon === "Sparkles" && <Icon className="h-3.5 w-3.5" />}
                {lang === "en" && item.labelEn ? item.labelEn : item.label}
                <NavBadge item={item} />
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <LanguageToggle lang={lang} onChange={setLang} />

          {/* Notifications */}
          {ctx && ctx.system.notificationsCount > 0 && (
            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </Button>
          )}

          {/* Profile menu or auth buttons */}
          {ctx ? (
            <ProfileMenu />
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs px-4 hidden sm:inline-flex">
                <Link to="/login">{lang === "en" ? "Sign In" : "Connexion"}</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full h-8 text-xs px-4">
                <Link to="/signup">{lang === "en" ? "Create Project" : "Créer un Projet"}</Link>
              </Button>
            </>
          )}

          {/* Mobile burger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 rounded-lg"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileDrawer onClose={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
    </header>
  );
};

export default SmartHeader;
