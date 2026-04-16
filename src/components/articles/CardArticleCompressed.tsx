import { Link } from "react-router-dom";
import { Clock, MapPin } from "lucide-react";
import ButtonTalkToAlexArticle from "./ButtonTalkToAlexArticle";

interface Props {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  city?: string;
  readingTime: number;
  publishedAt: string;
}

export default function CardArticleCompressed({ slug, title, excerpt, category, city, readingTime, publishedAt }: Props) {
  return (
    <div className="group rounded-xl border border-border/30 bg-card/50 hover:border-primary/30 transition-all duration-300 overflow-hidden">
      {/* Visual fallback */}
      <Link to={`/articles/${slug}`}>
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/8 to-secondary/5 flex items-center justify-center relative">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary/40">{category}</span>
        </div>
      </Link>

      <div className="p-4 space-y-2.5">
        {/* Meta */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{category}</span>
          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{readingTime} min</span>
          {city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{city}</span>}
        </div>

        {/* Title */}
        <Link to={`/articles/${slug}`}>
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{excerpt}</p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground/60">
            {new Date(publishedAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <ButtonTalkToAlexArticle title={title} slug={slug} category={category} />
        </div>
      </div>
    </div>
  );
}
