/**
 * UNPRO — SEO Internal Links
 * Renders related page links for crawlability and user flow.
 */

import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface LinkItem {
  to: string;
  label: string;
}

interface SeoInternalLinksProps {
  heading: string;
  links: LinkItem[];
}

const SeoInternalLinks = ({ heading, links }: SeoInternalLinksProps) => {
  if (links.length === 0) return null;

  return (
    <section>
      <h3 className="text-lg font-semibold text-foreground mb-3">{heading}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ChevronRight className="h-3 w-3" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SeoInternalLinks;
