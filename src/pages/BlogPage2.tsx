import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import ArticleCard from "@/components/shared/ArticleCard";
import CTASection from "@/components/shared/CTASection";
import { MOCK_BLOG_POSTS } from "@/data/mockBlogPosts";
import { useEffect } from "react";
import { injectJsonLd, collectionPageSchema, breadcrumbSchema } from "@/lib/seoSchema";

const CATEGORIES = [
  { slug: "all", label: "Tous" },
  { slug: "guides-renovation", label: "Guides rénovation" },
  { slug: "conseils-entretien", label: "Conseils entretien" },
  { slug: "vie-en-condo", label: "Vie en condo" },
];

interface BlogCategoryPageProps {
  categoryFilter?: string;
  pageTitle?: string;
  pageDescription?: string;
}

export default function BlogPage({ categoryFilter, pageTitle, pageDescription }: BlogCategoryPageProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(categoryFilter || "all");

  const effectiveCategory = categoryFilter || activeCategory;

  useEffect(() => {
    const title = pageTitle || "Derniers articles";
    const cleanups = [
      injectJsonLd(collectionPageSchema(title, pageDescription || "Articles et guides pour propriétaires au Québec", `https://unpro.ca/blog`)),
      injectJsonLd(breadcrumbSchema([
        { name: "Accueil", url: "https://unpro.ca" },
        { name: "Blog", url: "https://unpro.ca/blog" },
        ...(categoryFilter ? [{ name: pageTitle || "", url: `https://unpro.ca/blog/${categoryFilter}` }] : []),
      ])),
    ];
    return () => cleanups.forEach((c) => c());
  }, [categoryFilter]);

  const filtered = MOCK_BLOG_POSTS.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchCategory = effectiveCategory === "all" || p.category === effectiveCategory;
    return matchSearch && matchCategory;
  });

  const featured = filtered.find((p) => p.featured) || filtered[0];
  const rest = filtered.filter((p) => p !== featured);

  const title = pageTitle || "Derniers articles";
  const desc = pageDescription || "Guides, conseils et actualités pour les propriétaires du Québec.";

  return (
    <>
      <Helmet>
        <title>{`${title} — Blog | UNPRO`}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={`https://unpro.ca/blog${categoryFilter ? `/${categoryFilter}` : ""}`} />
      </Helmet>

      <Breadcrumbs items={[
        { label: "Blog", to: "/blog" },
        ...(categoryFilter ? [{ label: title }] : []),
      ]} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <PageHero title={title} subtitle={desc} compact>
          <div className="relative max-w-md mx-auto mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un article..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </PageHero>

        {/* Category chips (only on main blog page) */}
        {!categoryFilter && (
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.slug ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Featured article */}
        {featured && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Link to={`/blog/${featured.slug}`}>
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-6 md:p-8 space-y-3 hover:shadow-lg transition-all group">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">À la une</span>
                <h2 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{featured.title}</h2>
                <p className="text-muted-foreground">{featured.excerpt}</p>
                <div className="text-sm text-muted-foreground">{featured.readingTime} min • {featured.categoryLabel}</div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Articles grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <ArticleCard key={post.id} {...post} />
          ))}
        </div>

        {/* Section links (only on main blog page) */}
        {!categoryFilter && (
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { to: "/blog/guides-renovation", label: "Guides rénovation", desc: "Tout savoir avant de rénover" },
              { to: "/blog/conseils-entretien", label: "Conseils entretien", desc: "Protégez votre investissement" },
              { to: "/blog/vie-en-condo", label: "Vie en condo", desc: "Copropriété au Québec" },
            ].map((s) => (
              <Link key={s.to} to={s.to}>
                <div className="p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all group">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{s.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <CTASection
          title="Vous avez un projet en tête?"
          description="Parlez à Alex ou décrivez votre projet pour obtenir un rendez-vous garanti."
          primaryCta={{ label: "Parler à Alex", to: "/parler-a-alex" }}
          secondaryCta={{ label: "Décrire mon projet", to: "/decrire-mon-projet" }}
          variant="subtle"
        />
      </div>
    </>
  );
}
