/**
 * UNPRO — SectionArticleInternalLinksSEO
 * Renders internal links for crawlability, with semantic grouping.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Link2 } from "lucide-react";

interface LinkItem {
  url: string;
  anchor: string;
}

interface Props {
  links: LinkItem[];
  heading?: string;
}

export default function SectionArticleInternalLinksSEO({ links, heading = "À lire aussi" }: Props) {
  if (links.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      </div>
      <nav aria-label="Articles connexes">
        <ul className="space-y-2">
          {links.map((link, i) => {
            const isExternal = link.url.startsWith("http");
            return (
              <li key={i}>
                {isExternal ? (
                  <a
                    href={link.url}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    {link.anchor}
                  </a>
                ) : (
                  <Link
                    to={link.url}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    {link.anchor}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
