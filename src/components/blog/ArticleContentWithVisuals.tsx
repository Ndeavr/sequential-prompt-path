import BlockArticleParagraphReadable from "@/components/articles/BlockArticleParagraphReadable";
import {
  CompatibilityConstellation,
  DecisionModelComparison,
  THREE_QUOTES_ARTICLE_SLUG,
  ThreeQuotesTimeline,
} from "@/components/blog/ThreeQuotesEditorialVisuals";

const VISUAL_MARKERS = /<!--unpro:(timeline|compatibility|comparison)-->/g;

interface ArticleContentWithVisualsProps {
  html: string;
  slug: string;
}

export default function ArticleContentWithVisuals({ html, slug }: ArticleContentWithVisualsProps) {
  if (slug !== THREE_QUOTES_ARTICLE_SLUG) {
    return <BlockArticleParagraphReadable html={html} />;
  }

  const parts = html.split(VISUAL_MARKERS);

  return (
    <>
      {parts.map((part, index) => {
        if (part === "timeline") return <ThreeQuotesTimeline key={`timeline-${index}`} />;
        if (part === "compatibility") return <CompatibilityConstellation key={`compatibility-${index}`} />;
        if (part === "comparison") return <DecisionModelComparison key={`comparison-${index}`} />;
        if (!part.trim()) return null;
        return <BlockArticleParagraphReadable key={`content-${index}`} html={part} />;
      })}
    </>
  );
}
