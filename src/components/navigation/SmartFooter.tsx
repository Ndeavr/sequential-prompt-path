/**
 * UNPRO — Smart Footer
 * Multi-column, role-adaptive, SEO-rich footer.
 */

import { Link } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { getFooterSections } from "@/config/navigationConfig";
import { useLanguage } from "@/components/ui/LanguageToggle";

const SmartFooter = () => {
  const { activeRole } = useNavigationContext();
  const { lang } = useLanguage();
  const sections = getFooterSections(activeRole);

  return (
    <footer className="border-t border-border/20 py-10 px-5">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="font-display text-lg font-bold text-foreground">UNPRO</Link>
            <p className="text-caption text-muted-foreground mt-2 max-w-[200px]">
              {lang === "en" ? "Real estate intelligence for everyone." : "Intelligence immobilière pour tous."}
            </p>
          </div>

          {/* Dynamic sections */}
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-meta font-semibold text-foreground mb-3">
                {lang === "en" && section.titleEn ? section.titleEn : section.title}
              </h4>
              <ul className="space-y-2">
                {section.items.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-caption text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {lang === "en" && link.labelEn ? link.labelEn : link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mb-4" />
        <p className="text-caption text-muted-foreground/60">
          © {new Date().getFullYear()} UNPRO. {lang === "en" ? "All rights reserved." : "Tous droits réservés."}
        </p>
      </div>
    </footer>
  );
};

export default SmartFooter;
