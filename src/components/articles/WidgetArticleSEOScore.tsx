/**
 * UNPRO — WidgetArticleSEOScore
 * Displays a computed SEO/readability score badge (admin-facing, subtle for public).
 */

interface Props {
  seoScore: number;
  readabilityScore: number;
  aeoScore: number;
  showDetailed?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

export default function WidgetArticleSEOScore({ seoScore, readabilityScore, aeoScore, showDetailed = false }: Props) {
  const avg = Math.round((seoScore + readabilityScore + aeoScore) / 3);

  if (!showDetailed) {
    return (
      <span className={`text-xs font-mono font-medium ${scoreColor(avg)}`}>
        SEO {avg}/100
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className={scoreColor(seoScore)}>SEO {seoScore}</span>
      <span className={scoreColor(readabilityScore)}>READ {readabilityScore}</span>
      <span className={scoreColor(aeoScore)}>AEO {aeoScore}</span>
    </div>
  );
}
