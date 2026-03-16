/**
 * UNPRO — SEO Head Component
 * Sets document title, meta tags, Open Graph, and Twitter Card for SEO pages.
 */

import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: string;
}

const SeoHead = ({ title, description, canonical, noindex, ogImage, ogType = "website" }: SeoHeadProps) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", description);
    if (noindex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      const existing = document.querySelector('meta[name="robots"]');
      if (existing) existing.remove();
    }

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // Open Graph
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", "UNPRO", "property");
    if (canonical) setMeta("og:url", canonical, "property");
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
      setMeta("og:image:width", "1200", "property");
      setMeta("og:image:height", "630", "property");
    }

    // Twitter Card
    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);
  }, [title, description, canonical, noindex, ogImage, ogType]);

  return null;
};

export default SeoHead;
