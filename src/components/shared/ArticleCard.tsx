import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Tag } from "lucide-react";
import { motion } from "framer-motion";

interface ArticleCardProps {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  categoryLabel: string;
  readingTime: number;
  publishedAt: string;
  featured?: boolean;
}

export default function ArticleCard({ title, slug, excerpt, categoryLabel, readingTime, publishedAt, featured }: ArticleCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <Link to={`/blog/${slug}`}>
        <Card className={`hover:shadow-lg transition-all duration-300 group overflow-hidden h-full ${featured ? "border-primary/30" : ""}`}>
          <div className="aspect-[16/9] bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
            <span className="text-4xl opacity-20">📄</span>
          </div>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{categoryLabel}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{readingTime} min</span>
              <span>•</span>
              <span>{new Date(publishedAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}</span>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
