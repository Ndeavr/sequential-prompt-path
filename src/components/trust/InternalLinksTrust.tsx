/**
 * UNPRO — InternalLinksTrust
 * Internal cross-linking bar for trust layer pages.
 */
import { Link } from "react-router-dom";
import { Brain, Map, BookOpen, Star, Rocket } from "lucide-react";

const LINKS = [
  { to: "/comment-fonctionne-ia", label: "Comment ça marche", icon: Brain },
  { to: "/roadmap", label: "Roadmap", icon: Rocket },
  { to: "/couverture", label: "Couverture", icon: Map },
  { to: "/guides", label: "Guides", icon: BookOpen },
  { to: "/avis-verifies", label: "Avis vérifiés", icon: Star },
];

interface Props {
  /** Current page path to exclude from links */
  currentPath?: string;
}

export default function InternalLinksTrust({ currentPath }: Props) {
  const filtered = LINKS.filter((l) => l.to !== currentPath);
  return (
    <nav aria-label="Pages confiance UNPRO" className="flex flex-wrap justify-center gap-2 py-6">
      {filtered.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
