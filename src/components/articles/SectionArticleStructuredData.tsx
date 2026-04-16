/**
 * UNPRO — SectionArticleStructuredData
 * Injects Article + BreadcrumbList JSON-LD for SEO.
 */
import { useEffect } from "react";

interface Props {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
  wordCount?: number;
  category?: string;
  city?: string;
  h1?: string;
}

export default function SectionArticleStructuredData({
  title, description, slug, datePublished, dateModified, wordCount, category, city, h1,
}: Props) {
  useEffect(() => {
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: h1 || title,
      description,
      url: `https://unpro.ca/articles/${slug}`,
      datePublished,
      dateModified: dateModified || datePublished,
      wordCount: wordCount || undefined,
      author: { "@type": "Organization", name: "UNPRO" },
      publisher: {
        "@type": "Organization",
        name: "UNPRO",
        url: "https://unpro.ca",
        logo: { "@type": "ImageObject", url: "https://unpro.ca/logo.png" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": `https://unpro.ca/articles/${slug}` },
      ...(category ? { articleSection: category } : {}),
      ...(city ? { about: { "@type": "Place", name: city } } : {}),
      inLanguage: "fr-CA",
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca" },
        { "@type": "ListItem", position: 2, name: "Articles", item: "https://unpro.ca/articles" },
        { "@type": "ListItem", position: 3, name: title, item: `https://unpro.ca/articles/${slug}` },
      ],
    };

    const scripts: HTMLScriptElement[] = [];
    [articleSchema, breadcrumbSchema].forEach((schema, i) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = `seo-article-structured-${i}`;
      script.text = JSON.stringify(schema);
      const existing = document.getElementById(script.id);
      if (existing) existing.remove();
      document.head.appendChild(script);
      scripts.push(script);
    });

    return () => scripts.forEach((s) => s.remove());
  }, [title, description, slug, datePublished, dateModified, wordCount, category, city, h1]);

  return null;
}
