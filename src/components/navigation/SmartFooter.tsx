/**
 * UNPRO — Footer (Dark Sharp)
 */

import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { getFooterSections } from "@/config/navigationConfig";
import type { UserRole } from "@/types/navigation";
import unproWordmarkAsset from "@/assets/brand/unpro-logo-white.png.asset.json";
const unproWordmarkChrome = unproWordmarkAsset.url;

const socialLinks = [
  { href: "#", label: "Facebook", icon: "f" },
  { href: "#", label: "Instagram", icon: "ig" },
  { href: "#", label: "LinkedIn", icon: "in" },
];

const SmartFooter = () => {
  const { lang } = useLanguage();
  const { activeRole } = useNavigationContext();
  useLocation();

  const sections = getFooterSections(activeRole as UserRole | "guest");

  return (
    <footer
      className="border-t border-border/20 pb-24 lg:pb-0"
      style={{
        background:
          "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(217 91% 60% / 0.05), transparent 60%), linear-gradient(180deg, hsl(220 40% 5%) 0%, hsl(220 45% 3%) 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <img
                src={unproWordmarkChrome}
                alt="UNPRO"
                className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
                style={{
                  filter:
                    "drop-shadow(0 2px 4px hsl(220 50% 0% / 0.6))",
                }}
                draggable={false}
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-[240px] leading-relaxed">
              {lang === "en"
                ? "Exclusive guaranteed appointments. Not shared leads."
                : "Des rendez-vous garantis exclusifs. Pas des leads partagés."}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Concierge IA
              </span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">Québec ⚜️</span>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>🏠 {lang === "en" ? "Home Passport" : "Passeport Maison"}</p>
              <p>🤖 {lang === "en" ? "Smart Matching" : "Matching intelligent"}</p>
              <p>✨ {lang === "en" ? "Alex Assistant" : "Alex assistant"}</p>
            </div>
          </div>

          {/* Dynamic columns from config */}
          {sections.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                {lang === "en" && col.titleEn ? col.titleEn : col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.items.map((item, idx) => (
                  <li key={`${col.title}-${item.to}-${idx}`}>
                    <Link
                      to={item.to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
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
        <div className="h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
            <span>© {new Date().getFullYear()} UNPRO</span>
            <span>•</span>
            <span>Made in Québec ⚜️ with ❤️</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/20 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-colors text-xs font-bold"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
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
