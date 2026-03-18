import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface RelatedLink {
  to: string;
  label: string;
}

interface RelatedLinksSectionProps {
  title?: string;
  links: RelatedLink[];
}

export default function RelatedLinksSection({ title = "Liens connexes", links }: RelatedLinksSectionProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          >
            {link.label} <ArrowRight className="h-3 w-3" />
          </Link>
        ))}
      </div>
    </section>
  );
}
