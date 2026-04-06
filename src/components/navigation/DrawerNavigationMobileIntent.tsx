/**
 * UNPRO — Structured Mobile Drawer (Intent-Based)
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { getDrawerSections } from "@/config/navigationConfig";
import { resolveIcon } from "./IconResolver";
import BadgePersonaActiveNavigation from "./BadgePersonaActiveNavigation";
import MenuRoleSwitcherUniversal from "./MenuRoleSwitcherUniversal";
import HeaderSearch from "./HeaderSearch";
import SmartCTA from "@/components/cta/SmartCTA";
import MegaMenuMobileSection from "./MobileMenu";
import type { UserRole } from "@/types/navigation";

interface Props {
  onClose: () => void;
  ctx: any;
  activeRole: string;
}

export default function DrawerNavigationMobileIntent({ onClose, ctx, activeRole }: Props) {
  const { signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const { openAlex } = useAlexVoice();
  const isGuest = !ctx;

  const sections = getDrawerSections(activeRole as UserRole | "guest");

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
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <span className="font-display text-lg font-bold text-foreground">UNPRO</span>
            <div className="flex items-center gap-1.5">
              <LanguageToggle lang={lang} onChange={setLang} />
              <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-lg">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-5">
            <HeaderSearch lang={lang} variant="mobile" onClose={onClose} />
          </div>

          {!isGuest ? (
            <>
              {/* Section 1 — Active persona + role switcher */}
              <div className="mb-5 space-y-3">
                <BadgePersonaActiveNavigation />
                <MenuRoleSwitcherUniversal onSwitch={() => {}} />
              </div>

              {/* Dashboard link */}
              <Link
                to={dashboardTo}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl btn-liquid-metal font-semibold text-sm mb-4"
              >
                {lang === "en" ? "Dashboard" : "Tableau de bord"}
              </Link>

              {/* Drawer sections */}
              {sections.map((section) => (
                <div key={section.id} className="mb-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    {lang === "en" && section.labelEn ? section.labelEn : section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = resolveIcon(item.icon);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={onClose}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/40 transition-colors"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {lang === "en" && item.labelEn ? item.labelEn : item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Alex CTA */}
              <button
                onClick={() => { onClose(); openAlex("general"); }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground font-medium text-sm mb-4 w-full text-left"
              >
                ✨ {lang === "en" ? "Talk to Alex" : "Parler à Alex"}
              </button>

              {/* Footer */}
              <div className="mt-auto pt-4 border-t border-border/30 space-y-1">
                <Link to="/settings" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
                  {lang === "en" ? "Settings" : "Paramètres"}
                </Link>
                <button
                  onClick={() => { signOut(); onClose(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/5 transition-colors w-full text-left"
                >
                  {lang === "en" ? "Sign Out" : "Déconnexion"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Guest quick actions */}
              <div className="space-y-1 mb-6">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {lang === "en" ? "Quick Actions" : "Actions rapides"}
                </p>
                <Link to="/role" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl btn-liquid-metal font-semibold text-sm">
                  {lang === "en" ? "Get Started Free" : "Commencer gratuitement"}
                </Link>
                <button
                  onClick={() => { onClose(); openAlex("general"); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground font-medium text-sm w-full text-left"
                >
                  ✨ {lang === "en" ? "Talk to Alex" : "Parler à Alex"}
                </button>
                <Link to="/proprietaires/passeport-maison" onClick={onClose} className="flex items-center gap-3 px-3 py-3 rounded-xl surface-metal-glass text-foreground font-medium text-sm">
                  {lang === "en" ? "Create My Home Passport" : "Créer mon Passeport Maison"}
                </Link>
              </div>

              {/* Guest sections */}
              {sections.map((section) => (
                <div key={section.id} className="mb-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    {lang === "en" && section.labelEn ? section.labelEn : section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = resolveIcon(item.icon);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={onClose}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/40 transition-colors"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {lang === "en" && item.labelEn ? item.labelEn : item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <MegaMenuMobileSection lang={lang} onClose={onClose} />

              {/* Login */}
              <div className="mt-4 pt-4 border-t border-border/30">
                <Link to="/role" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
                  {lang === "en" ? "Sign In" : "Connexion"}
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
