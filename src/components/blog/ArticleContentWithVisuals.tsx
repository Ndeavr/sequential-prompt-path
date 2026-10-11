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
    return <>
      {slug === "pavage-asphalte-laval-entree-garage" && (
        <aside className="mb-6 border-l-2 border-border bg-muted p-4 text-sm text-foreground" aria-label="Contexte des prix">
          Les fourchettes de prix ci-dessous datent de 2024. Elles sont conservées comme référence historique,
          et ne constituent pas une estimation pour octobre 2026. Demandez une évaluation actuelle pour votre terrain et vos travaux.
        </aside>
      )}
      <BlockArticleParagraphReadable html={html} />
    </>;
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
