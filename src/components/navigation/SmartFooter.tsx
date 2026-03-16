/**
 * UNPRO — Strategic Footer (Role-Aware)
 * Uses getFooterSections from config. Fixes "lead" terminology.
 */

import { Link } from "react-router-dom";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { getFooterSections } from "@/config/navigationConfig";
import type { UserRole } from "@/types/navigation";
import unproLogo from "@/assets/unpro-logo.png";

const socialLinks = [
  { href: "#", label: "Facebook", icon: "f" },
  { href: "#", label: "Instagram", icon: "ig" },
  { href: "#", label: "LinkedIn", icon: "in" },
];

const SmartFooter = () => {
  const { lang } = useLanguage();
  const { activeRole } = useNavigationContext();

  const sections = getFooterSections(activeRole as UserRole | "guest");

  return (
    <footer className="border-t border-border/20 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img
                src={unproLogo}
                alt="UNPRO"
                className="h-8 w-8 rounded-lg object-contain"
                style={{ filter: "brightness(0) saturate(100%) invert(28%) sepia(92%) saturate(1800%) hue-rotate(213deg) brightness(101%) contrast(101%)" }}
              />
              <span className="font-display text-lg font-bold text-foreground tracking-tight">UNPRO</span>
            </Link>
            <p className="text-meta text-muted-foreground mb-4 max-w-[220px] leading-relaxed">
              {lang === "en"
                ? "Exclusive guaranteed appointments. Not shared leads."
                : "Des rendez-vous garantis exclusifs. Pas des leads partagés."}
            </p>
            <div className="space-y-1.5 text-caption text-muted-foreground/70">
              <p>🏠 {lang === "en" ? "Home Passport" : "Passeport Maison"}</p>
              <p>🤖 {lang === "en" ? "Smart Matching" : "Matching intelligent"}</p>
              <p>✨ {lang === "en" ? "Alex Assistant" : "Alex assistant"}</p>
            </div>
          </div>

          {/* Dynamic columns from config */}
          {sections.map((col) => (
            <div key={col.title}>
              <h4 className="text-caption font-bold text-foreground uppercase tracking-wider mb-4">
                {lang === "en" && col.titleEn ? col.titleEn : col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-meta text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {lang === "en" && item.labelEn ? item.labelEn : item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-caption text-muted-foreground/50">
            <span>© {new Date().getFullYear()} UNPRO</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              {lang === "en" ? "Made in Quebec" : "Fabriqué au Québec"} 🍁
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-caption font-bold"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3 text-caption text-muted-foreground/50">
              <Link to="/conditions" className="hover:text-foreground transition-colors">
                {lang === "en" ? "Terms" : "Conditions"}
              </Link>
              <Link to="/confidentialite" className="hover:text-foreground transition-colors">
                {lang === "en" ? "Privacy" : "Confidentialité"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SmartFooter;
