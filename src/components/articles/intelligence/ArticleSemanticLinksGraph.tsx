/**
 * ArticleSemanticLinksGraph — internal linking section powered by the
 * Quebec Housing Intelligence Graph. Tries to match the article topic by
 * keywords; falls back to a curated default set.
 */
import { Link } from "react-router-dom";
import { Network } from "lucide-react";
import { HOUSING_GRAPH, getRelated, type GraphNode } from "@/data/housingIntelligenceGraph";

function detectTopic(title: string, category?: string): GraphNode | null {
  const hay = `${title} ${category || ""}`.toLowerCase();
  const order = ["humidite-grenier", "barrages-de-glace", "condensation-fenetres", "facture-hydro", "moisissure", "ventilation", "isolation", "etancheite-air", "pertes-chaleur", "humidite"];
  for (const slug of order) {
    const node = HOUSING_GRAPH[slug];
    if (node && hay.includes(node.label.toLowerCase().split(" ")[0])) return node;
  }
  return null;
}

export default function ArticleSemanticLinksGraph({
  title, category, city,
}: { title: string; category?: string; city?: string }) {
  const topic = detectTopic(title, category);
  const related = topic ? getRelated(topic.slug) : Object.values(HOUSING_GRAPH).slice(0, 5);
  if (!related.length) return null;

  return (
    <section className="rounded-2xl border border-border/50 bg-muted/20 p-5 not-prose">
      <header className="flex items-center gap-2 mb-3">
        <Network className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
          Graphe d'intelligence — sujets reliés{city ? ` à ${city}` : ""}
        </h2>
      </header>
      <div className="flex flex-wrap gap-2">
        {related.map((n) => (
          <Link
            key={n.slug}
            to={city ? `/probleme/${n.slug}/${city.toLowerCase()}` : `/probleme/${n.slug}`}
            className="px-3 py-1.5 rounded-full border border-border/60 bg-background/60 text-[13px] text-foreground/80 hover:text-primary hover:border-primary/40 transition"
          >
            {n.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
