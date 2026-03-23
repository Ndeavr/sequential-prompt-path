import { enrichTextWithGrantLinks, detectGrants } from "@/services/grantLinkingService";
import GrantMentionCard from "./GrantMentionCard";

interface EnrichedFaqAnswerProps {
  text: string;
}

export default function EnrichedFaqAnswer({ text }: EnrichedFaqAnswerProps) {
  const segments = enrichTextWithGrantLinks(text);
  const grants = detectGrants(text);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {segments.map((seg, i) =>
          seg.type === "grant" && seg.grant ? (
            <a
              key={i}
              href={seg.grant.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            >
              {seg.content}
            </a>
          ) : (
            <span key={i}>{seg.content}</span>
          )
        )}
      </p>

      {grants.length > 0 && (
        <div className="space-y-2 pt-1">
          {grants.map((grant) => (
            <GrantMentionCard key={grant.name} grant={grant} />
          ))}
        </div>
      )}
    </div>
  );
}
