/**
 * UNPRO — BlockArticleParagraphReadable
 * Renders article HTML with scoped readable styles (.unpro-article in index.css).
 * Tables are wrapped in a local, keyboard-focusable horizontal scroll region.
 */

interface Props {
  html: string;
  className?: string;
}

function wrapTables(html: string): string {
  return html
    .replace(/<table\b/gi, '<div class="unpro-table-wrap" role="region" aria-label="Tableau" tabindex="0"><table')
    .replace(/<\/table>/gi, "</table></div>");
}

export default function BlockArticleParagraphReadable({ html, className = "" }: Props) {
  return (
    <div
      className={`unpro-article ${className}`}
      dangerouslySetInnerHTML={{ __html: wrapTables(html) }}
    />
  );
}
