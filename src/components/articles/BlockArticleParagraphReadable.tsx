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
        prose prose-sm md:prose-base max-w-none text-foreground
        prose-headings:text-foreground prose-headings:font-bold
        prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
        prose-p:mb-5 prose-p:leading-[1.85] prose-p:text-foreground/90
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground prose-strong:font-semibold
        prose-li:text-foreground/85 prose-li:leading-relaxed prose-li:mb-1
        prose-ul:space-y-1.5 prose-ul:pl-5 prose-ul:my-4
        prose-ol:space-y-1.5 prose-ol:pl-5 prose-ol:my-4
        prose-ul:list-disc prose-ol:list-decimal
        prose-blockquote:border-l-primary/40 prose-blockquote:bg-primary/5
        prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4
        prose-blockquote:text-foreground/80 prose-blockquote:not-italic
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
