import { ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { GrantProgram } from "@/services/grantLinkingService";

interface GrantMentionCardProps {
  grant: GrantProgram;
}

export default function GrantMentionCard({ grant }: GrantMentionCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{grant.name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {grant.description}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <a
          href={grant.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          Détails <ExternalLink className="h-3 w-3" />
        </a>
        <Link
          to={grant.unproRoute}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Vérifier mon admissibilité <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
