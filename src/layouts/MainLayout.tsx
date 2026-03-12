/**
 * UNPRO — Main Layout (Premium Dark-first)
 */

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Home as HomeIcon, Menu, X, Bell, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import AlexConcierge from "@/components/alex/AlexConcierge";
import { useEffect } from "react";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";

interface MainLayoutProps {
  children: ReactNode;
}

const navLinks = [
  { to: "/search", label: "Trouver un Pro" },
  { to: "/homeowners", label: "Services" },
  { to: "/pricing", label: "Tarifs" },
  { to: "/professionals", label: "FAQ" },
];

const MainLayout = ({ children }: MainLayoutProps) => {
  const { isAuthenticated, role } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const dash = role === "contractor" ? "/pro" : role === "admin" ? "/admin" : "/dashboard";

  // Force light mode on all public pages
  useEffect(() => {
    if (theme !== "light") setTheme("light");
  }, [theme, setTheme]);

  const showAlex = pathname !== "/alex";

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-40 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-glow transition-shadow group-hover:shadow-glow-lg">
              <HomeIcon className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-bold text-foreground tracking-tight">UNPRO</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 text-meta font-medium rounded-lg transition-all duration-200 ${
                  pathname.startsWith(link.to)
                    ? "text-foreground bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200"
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {/* Language toggle */}
            <LanguageToggle lang={lang} onChange={setLang} />

            {/* Alerts */}
            {isAuthenticated && (
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </Button>
            )}

            {isAuthenticated ? (
              <Button asChild size="sm" className="rounded-full h-8 text-xs px-4">
                <Link to={dash}>Tableau de bord</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs px-4 hidden sm:inline-flex">
                  <Link to="/login">Connexion</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full h-8 text-xs px-4">
                  <Link to="/signup">Créer un Projet</Link>
                </Button>
              </>
            )}

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
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden overflow-hidden border-t border-border/20"
            >
              <nav className="px-5 py-3 space-y-0.5">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-meta font-medium transition-colors ${
                      pathname.startsWith(link.to)
                        ? "text-foreground bg-muted/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {/* Mobile theme + language row */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                      <span>{theme === "dark" ? "Clair" : "Sombre"}</span>
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
                      className="flex items-center gap-1 text-caption font-semibold uppercase tracking-wider"
                    >
                      <span className={lang === "fr" ? "text-foreground" : "text-muted-foreground/40"}>FR</span>
                      <span className="text-border">/</span>
                      <span className={lang === "en" ? "text-foreground" : "text-muted-foreground/40"}>EN</span>
                    </button>
                  </div>
                </div>
                <div className="divider-gradient my-2" />
                {isAuthenticated ? (
                  <Link to={dash} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-meta font-semibold text-primary">
                    Tableau de bord
                  </Link>
                ) : (
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-meta text-muted-foreground">
                    Connexion
                  </Link>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">{children}</main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/20 py-10 px-5">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <Link to="/" className="font-display text-sm font-bold text-foreground">UNPRO</Link>
              <p className="text-caption text-muted-foreground mt-1">Intelligence immobilière pour tous.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-muted-foreground">
              <Link to="/homeowners" className="hover:text-foreground transition-colors">Propriétaires</Link>
              <Link to="/professionals" className="hover:text-foreground transition-colors">Professionnels</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Tarifs</Link>
              <Link to="/search" className="hover:text-foreground transition-colors">Trouver un Pro</Link>
            </div>
          </div>
          <div className="divider-gradient mt-6 mb-4" />
          <p className="text-caption text-muted-foreground/60">© {new Date().getFullYear()} UNPRO. Tous droits réservés.</p>
        </div>
      </footer>

      {/* ─── Alex AI Assistant ─── */}
      {showAlex && <AlexConcierge />}
    </div>
  );
};

export default MainLayout;
