/**
 * UNPRO — Strategic Footer (5-column, premium)
 */

import { Link } from "react-router-dom";
import { useLanguage } from "@/components/ui/LanguageToggle";
import unproLogo from "@/assets/unpro-logo.png";

const footerColumns = [
  {
    title: "Propriétaires", titleEn: "Homeowners",
    items: [
      { to: "/proprietaires/passeport-maison", label: "Passeport Maison", labelEn: "Home Passport" },
      { to: "/proprietaires/score-maison", label: "Mon Score Maison", labelEn: "My Home Score" },
      { to: "/verifier-entrepreneur", label: "Vérifier une entreprise", labelEn: "Verify a Company" },
      { to: "/compare-quotes", label: "Comparer mes soumissions", labelEn: "Compare My Quotes" },
      { to: "/alex?intent=diagnostic", label: "Diagnostiquer un problème", labelEn: "Diagnose a Problem" },
      { to: "/dashboard/documents/upload", label: "Documents maison", labelEn: "Home Documents" },
    ],
  },
  {
    title: "Entrepreneurs", titleEn: "Contractors",
    items: [
      { to: "/entrepreneurs/creer-mon-profil", label: "Activer mon profil", labelEn: "Activate My Profile" },
      { to: "/pricing", label: "Plans et tarifs", labelEn: "Plans & Pricing" },
      { to: "/entrepreneurs/score-aipp", label: "Score AIPP", labelEn: "AIPP Score" },
      { to: "/entrepreneurs/demo", label: "Démo", labelEn: "Demo" },
      { to: "/pro/leads", label: "Leads qualifiés", labelEn: "Qualified Leads" },
      { to: "/entrepreneurs/pages-ia", label: "Pages IA / SEO", labelEn: "AI / SEO Pages" },
    ],
  },
  {
    title: "Explorer", titleEn: "Explore",
    items: [
      { to: "/problemes", label: "Problèmes maison", labelEn: "Home Problems" },
      { to: "/services", label: "Services", labelEn: "Services" },
      { to: "/professionnels", label: "Professionnels", labelEn: "Professionals" },
      { to: "/villes", label: "Villes", labelEn: "Cities" },
      { to: "/blog", label: "Blog", labelEn: "Blog" },
      { to: "/faq", label: "FAQ", labelEn: "FAQ" },
    ],
  },
  {
    title: "Entreprise", titleEn: "Company",
    items: [
      { to: "/a-propos", label: "À propos", labelEn: "About" },
      { to: "/partenaires", label: "Partenaires", labelEn: "Partners" },
      { to: "/contact", label: "Contact", labelEn: "Contact" },
      { to: "/conditions", label: "Conditions", labelEn: "Terms" },
      { to: "/confidentialite", label: "Confidentialité", labelEn: "Privacy" },
      { to: "/cookies", label: "Cookies", labelEn: "Cookies" },
    ],
  },
];

const socialLinks = [
  { href: "#", label: "Facebook", icon: "f" },
  { href: "#", label: "Instagram", icon: "ig" },
  { href: "#", label: "LinkedIn", icon: "in" },
];

const SmartFooter = () => {
  const { lang } = useLanguage();

  return (
    <footer className="border-t border-border/20 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12 lg:py-16">
        {/* Main grid */}
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
                ? "Real estate intelligence for everyone."
                : "Intelligence immobilière pour tous."}
            </p>
            <div className="space-y-1.5 text-caption text-muted-foreground/70">
              <p>🏠 {lang === "en" ? "Home Passport" : "Passeport Maison"}</p>
              <p>🤖 {lang === "en" ? "Smart Matching" : "Matching intelligent"}</p>
              <p>✨ {lang === "en" ? "Alex Assistant" : "Alex assistant"}</p>
            </div>
          </div>

          {/* Dynamic columns */}
          {footerColumns.map((col) => (
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
            {/* Social */}
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

            {/* Utility links */}
            <div className="flex items-center gap-3 text-caption text-muted-foreground/50">
              <Link to="/sitemap" className="hover:text-foreground transition-colors">Sitemap</Link>
              <Link to="/accessibilite" className="hover:text-foreground transition-colors">
                {lang === "en" ? "Accessibility" : "Accessibilité"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SmartFooter;
