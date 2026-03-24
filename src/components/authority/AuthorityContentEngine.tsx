import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Globe, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { userId?: string; }

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-warning/10 text-warning border border-warning/20",
  published: "bg-success/10 text-success border border-success/20",
};

export default function AuthorityContentEngine({ userId }: Props) {
  const { data: articles = [] } = useQuery({
    queryKey: ["authority-articles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("authority_articles")
        .select("*, authority_topics(title, category)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  // Demo data if empty
  const items = articles.length > 0 ? articles : [
    { id: "1", title: "Isolation de toiture : guide complet Montréal", status: "published", aeo_score: 87, seo_score: 92, authority_topics: { category: "toiture" } },
    { id: "2", title: "Comment choisir son entrepreneur en rénovation", status: "published", aeo_score: 78, seo_score: 85, authority_topics: { category: "guide" } },
    { id: "3", title: "Loi 16 : obligations des copropriétés", status: "draft", aeo_score: 45, seo_score: 60, authority_topics: { category: "condo" } },
    { id: "4", title: "Coûts de rénovation cuisine 2026", status: "review", aeo_score: 62, seo_score: 70, authority_topics: { category: "cuisine" } },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Content Engine
        </h2>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Sparkles className="h-3 w-3" /> Générer
        </Button>
      </div>

      <div className="space-y-2.5">
        {items.map((article: any, i: number) => {
          const aeo = article.aeo_score ?? 0;
          const isHigh = aeo >= 75;

          return (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.07 }}
              className={`group rounded-xl border p-3 backdrop-blur-sm transition-all hover:shadow-[var(--shadow-md)] cursor-pointer ${
                isHigh ? "border-primary/20 bg-primary/[0.03]" : "border-border/40 bg-card/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{article.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[article.status] ?? STATUS_BADGE.draft}`}>
                      {article.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      AEO {aeo}
                    </span>
                    {isHigh && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium">
                        <Zap className="h-2.5 w-2.5" /> Top
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

function Zap(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
