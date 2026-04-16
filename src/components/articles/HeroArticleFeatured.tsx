import { Link } from "react-router-dom";
import { Clock, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
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

export default function HeroArticleFeatured({ slug, title, excerpt, category, city, readingTime, publishedAt }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-card overflow-hidden"
    >
      {/* Visual */}
      <Link to={`/articles/${slug}`}>
        <div className="aspect-[2/1] md:aspect-[3/1] bg-gradient-to-br from-primary/10 to-secondary/5 flex items-center justify-center">
          <span className="text-sm font-bold uppercase tracking-widest text-primary/30">Article vedette</span>
        </div>
      </Link>

      <div className="p-5 md:p-6 space-y-3">
        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium text-[11px]">{category}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{readingTime} min</span>
          {city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{city}</span>}
          <span>{new Date(publishedAt).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>

        {/* Title */}
        <Link to={`/articles/${slug}`}>
          <h2 className="text-lg md:text-xl font-bold text-foreground leading-tight hover:text-primary transition-colors">
            {title}
          </h2>
        </Link>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{excerpt}</p>

        {/* CTAs */}
        <div className="flex items-center gap-4 pt-1">
          <Link
            to={`/articles/${slug}`}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
          >
            Lire l'article <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <ButtonTalkToAlexArticle title={title} slug={slug} category={category} />
        </div>
      </div>
    </motion.div>
  );
}
