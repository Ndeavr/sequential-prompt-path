/**
 * UNPRO — Contextual Sub-Navigation
 * Page-level anchor nav (e.g., on service/problem pages).
 */

import { useLocation } from "react-router-dom";

interface ContextualNavItem {
  id: string;
  label: string;
  labelEn?: string;
}

const pageContextNavs: Record<string, ContextualNavItem[]> = {
  service: [
    { id: "overview", label: "Aperçu", labelEn: "Overview" },
    { id: "costs", label: "Coûts", labelEn: "Costs" },
    { id: "signs", label: "Signes", labelEn: "Signs" },
    { id: "solutions", label: "Solutions" },
    { id: "contractors", label: "Entrepreneurs", labelEn: "Contractors" },
    { id: "faq", label: "FAQ" },
  ],
  problem: [
    { id: "overview", label: "Aperçu", labelEn: "Overview" },
    { id: "causes", label: "Causes" },
    { id: "solutions", label: "Solutions" },
    { id: "costs", label: "Coûts", labelEn: "Costs" },
    { id: "contractors", label: "Entrepreneurs", labelEn: "Contractors" },
    { id: "faq", label: "FAQ" },
  ],
  professional: [
    { id: "overview", label: "Aperçu", labelEn: "Overview" },
    { id: "services", label: "Services" },
    { id: "reviews", label: "Avis", labelEn: "Reviews" },
    { id: "cities", label: "Villes", labelEn: "Cities" },
    { id: "verifications", label: "Vérifications", labelEn: "Verifications" },
    { id: "faq", label: "FAQ" },
  ],
  city: [
    { id: "overview", label: "Aperçu", labelEn: "Overview" },
    { id: "services", label: "Services" },
    { id: "problems", label: "Problèmes", labelEn: "Problems" },
    { id: "contractors", label: "Entrepreneurs", labelEn: "Contractors" },
    { id: "faq", label: "FAQ" },
  ],
};

interface ContextualNavProps {
  pageType?: string;
  items?: ContextualNavItem[];
  lang?: "fr" | "en";
  className?: string;
}

export default function ContextualNav({ pageType, items, lang = "fr", className = "" }: ContextualNavProps) {
  const navItems = items || (pageType ? pageContextNavs[pageType] : null);
  if (!navItems || navItems.length === 0) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className={`flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border/20 ${className}`} aria-label="Page sections">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollTo(item.id)}
          className="px-3.5 py-2.5 text-meta font-medium text-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 border-transparent hover:border-primary/40 transition-all duration-200"
        >
          {lang === "en" && item.labelEn ? item.labelEn : item.label}
        </button>
      ))}
    </nav>
  );
}
