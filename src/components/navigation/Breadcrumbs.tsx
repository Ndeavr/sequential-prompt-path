/**
 * UNPRO — Breadcrumbs
 * Premium breadcrumb component with JSON-LD support.
 */

import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useEffect } from "react";
import { injectJsonLd, breadcrumbSchema } from "@/lib/seoSchema";

const routeLabels: Record<string, { fr: string; en: string }> = {
  proprietaires: { fr: "Propriétaires", en: "Homeowners" },
  entrepreneurs: { fr: "Entrepreneurs", en: "Contractors" },
  condo: { fr: "Condo", en: "Condo" },
  problemes: { fr: "Problèmes maison", en: "Home Problems" },
  services: { fr: "Services", en: "Services" },
  professionnels: { fr: "Professionnels", en: "Professionals" },
  villes: { fr: "Villes", en: "Cities" },
  guides: { fr: "Guides", en: "Guides" },
  faq: { fr: "FAQ", en: "FAQ" },
  blog: { fr: "Blog", en: "Blog" },
  dashboard: { fr: "Tableau de bord", en: "Dashboard" },
  pro: { fr: "Espace pro", en: "Pro Area" },
  admin: { fr: "Admin", en: "Admin" },
};

function slugToLabel(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

interface BreadcrumbsProps {
  lang?: "fr" | "en";
  items?: { label: string; to?: string }[];
  className?: string;
}

export default function Breadcrumbs({ lang = "fr", items, className = "" }: BreadcrumbsProps) {
  const { pathname } = useLocation();

  const crumbs = items || (() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, i) => {
      const to = "/" + segments.slice(0, i + 1).join("/");
      const mapped = routeLabels[seg];
      const label = mapped ? mapped[lang] : slugToLabel(seg);
      return { label, to: i < segments.length - 1 ? to : undefined };
    });
  })();

  // Inject JSON-LD
  useEffect(() => {
    if (crumbs.length === 0) return;
    const schemaItems = [
      { name: lang === "en" ? "Home" : "Accueil", url: "https://unpro.ca/" },
      ...crumbs.map((c) => ({
        name: c.label,
        url: `https://unpro.ca${c.to || pathname}`,
      })),
    ];
    const cleanup = injectJsonLd(breadcrumbSchema(schemaItems));
    return cleanup;
  }, [pathname, crumbs, lang]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-caption text-muted-foreground ${className}`}>
      <Link to="/" className="hover:text-foreground transition-colors" aria-label={lang === "en" ? "Home" : "Accueil"}>
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
          {crumb.to ? (
            <Link to={crumb.to} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
