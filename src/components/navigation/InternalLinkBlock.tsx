/**
 * UNPRO — Internal Link Block
 * Contextual internal linking component for SEO maillage.
 */

import { Link } from "react-router-dom";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { getContextualLinks } from "@/data/seoMockData";

interface InternalLinkBlockProps {
  pageType: string;
  slug?: string;
  city?: string;
  className?: string;
}

export default function InternalLinkBlock({ pageType, slug, city, className = "" }: InternalLinkBlockProps) {
  const { lang } = useLanguage();
  const sections = getContextualLinks(pageType, slug, city);

  if (sections.length === 0) return null;

  return (
    <div className={`py-8 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <div key={section.section} className="rounded-xl border border-border/20 bg-card/50 p-5">
            <h3 className="text-meta font-semibold text-foreground mb-3">
              {lang === "en" ? section.sectionEn : section.section}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-meta text-primary hover:text-primary/80 transition-colors story-link"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
