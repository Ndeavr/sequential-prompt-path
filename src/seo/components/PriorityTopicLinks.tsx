/**
 * UNPRO — Priority topic links.
 *
 * Editorial-surface link block that funnels crawl equity to the highest-demand
 * programmatic pages. Rendered on /blog and /journal.
 */
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PRIORITY_PAGES } from "@/seo/data/priorityPages";

interface PriorityTopicLinksProps {
  /** `light` follows the design tokens; `dark` is for the cinematic /journal surface. */
  variant?: "light" | "dark";
  heading?: string;
  className?: string;
}

const PriorityTopicLinks = ({
  variant = "light",
  heading = "Sujets les plus consultés au Québec",
  className = "",
}: PriorityTopicLinksProps) => {
  const isDark = variant === "dark";

  return (
    <section
      className={`${isDark ? "border-t border-white/5" : "border-t border-border"} ${className}`}
      aria-labelledby="priority-topics-heading"
    >
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2
          id="priority-topics-heading"
          className={`text-lg font-semibold mb-5 ${isDark ? "text-white/90" : "text-foreground"}`}
        >
          {heading}
        </h2>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRIORITY_PAGES.map((page) => (
            <li key={page.to}>
              <Link
                to={page.to}
                className={`inline-flex items-start gap-1.5 text-sm hover:underline ${
                  isDark ? "text-white/75 hover:text-white" : "text-primary"
                }`}
              >
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{page.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default PriorityTopicLinks;
