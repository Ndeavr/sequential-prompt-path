/**
 * UNPRO — BlockArticleParagraphReadable
 * Renders HTML content with optimized readability: short paragraphs, clean lists, generous spacing.
 */

interface Props {
  html: string;
  className?: string;
}

export default function BlockArticleParagraphReadable({ html, className = "" }: Props) {
  return (
    <div
      className={`
        prose prose-base md:prose-lg max-w-none text-foreground/90
        prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
        prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-5
        prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4
        prose-p:my-5 prose-p:leading-[1.85] prose-p:text-foreground/85
        prose-p:text-[16px] md:prose-p:text-[17px]
        prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground prose-strong:font-semibold
        prose-em:text-foreground/75
        prose-li:text-foreground/85 prose-li:leading-[1.75] prose-li:my-2
        prose-li:text-[16px] md:prose-li:text-[17px]
        prose-ul:space-y-2 prose-ul:pl-6 prose-ul:my-6 prose-ul:list-disc
        prose-ol:space-y-2 prose-ol:pl-6 prose-ol:my-6 prose-ol:list-decimal
        prose-blockquote:border-l-4 prose-blockquote:border-l-primary/50
        prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg
        prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:my-6
        prose-blockquote:text-foreground/85 prose-blockquote:not-italic prose-blockquote:font-medium
        prose-hr:my-10 prose-hr:border-border/40
        prose-img:rounded-xl prose-img:my-8
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
