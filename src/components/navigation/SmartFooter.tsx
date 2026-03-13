/**
 * UNPRO — Smart Footer
 * Adapts links by role.
 */

import { Link } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { getFooterLinks } from "@/config/navigationConfig";
import { useLanguage } from "@/components/ui/LanguageToggle";

const SmartFooter = () => {
  const { activeRole } = useNavigationContext();
  const { lang } = useLanguage();
  const links = getFooterLinks(activeRole);

  return (
    <footer className="border-t border-border/20 py-10 px-5">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Link to="/" className="font-display text-sm font-bold text-foreground">UNPRO</Link>
            <p className="text-caption text-muted-foreground mt-1">
              {lang === "en" ? "Real estate intelligence for everyone." : "Intelligence immobilière pour tous."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-muted-foreground">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-foreground transition-colors">
                {lang === "en" && link.labelEn ? link.labelEn : link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mt-6 mb-4" />
        <p className="text-caption text-muted-foreground/60">© {new Date().getFullYear()} UNPRO. {lang === "en" ? "All rights reserved." : "Tous droits réservés."}</p>
      </div>
    </footer>
  );
};

export default SmartFooter;
