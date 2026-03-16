/**
 * UNPRO — Footer SEO Grid
 * Contextual internal linking grid displayed on SEO pages.
 */

import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { mockCities, mockServices, mockProblems, mockProfessions, mockGuides } from "@/data/seoMockData";

function detectPageContext(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "problemes") return { type: "problem", slug: parts[1], city: parts[2] };
  if (parts[0] === "services") return { type: "service", slug: parts[1] };
  if (parts[0] === "villes") return { type: "city", slug: parts[1], service: parts[2] };
  if (parts[0] === "professionnels") return { type: "professional", slug: parts[1], city: parts[2] };
  return null;
}

export default function FooterSEOGrid() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const ctx = detectPageContext(pathname);

  if (!ctx) return null;

  const sections: { title: string; links: { to: string; label: string }[] }[] = [];

  if (ctx.type === "city" || ctx.type === "problem") {
    const cityName = ctx.type === "city" ? ctx.slug : ctx.city;
    const city = mockCities.find(c => c.slug === cityName);
    if (city) {
      sections.push({
        title: lang === "en" ? `Popular Problems in ${city.name}` : `Problèmes populaires à ${city.name}`,
        links: mockProblems.map(p => ({
          to: `/problemes/${p.slug}/${city.slug}`,
          label: `${p.name} à ${city.name}`,
        })),
      });
    }
  }

  sections.push({
    title: lang === "en" ? "Popular Services" : "Services populaires",
    links: mockServices.map(s => ({ to: `/services/${s.slug}`, label: s.name })),
  });

  sections.push({
    title: lang === "en" ? "Related Professionals" : "Professionnels connexes",
    links: mockProfessions.map(p => ({ to: `/professionnels/${p.slug}`, label: p.name })),
  });

  sections.push({
    title: lang === "en" ? "Nearby Cities" : "Villes connexes",
    links: mockCities.map(c => ({ to: `/villes/${c.slug}`, label: c.name })),
  });

  sections.push({
    title: lang === "en" ? "Useful Guides" : "Guides utiles",
    links: mockGuides.map(g => ({
      to: `/guides/${g.slug}`,
      label: lang === "en" ? g.titleEn : g.title,
    })),
  });

  return (
    <div className="border-t border-border/10 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h4>
              <ul className="space-y-1.5">
                {section.links.slice(0, 6).map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-caption text-muted-foreground/70 hover:text-foreground transition-colors leading-snug block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
