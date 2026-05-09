/**
 * UNPRO — SEO Head Component
 * Sets title, meta, canonical, hreflang (FR + EN + x-default), Open Graph, Twitter.
 */
import { useEffect } from "react";
import { getEnglishCounterpart, getFrenchCounterpart } from "@/seo/services/canonicalManager";

interface SeoHeadProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: string;
  /** Optional explicit EN counterpart URL (full https://...) */
  englishCanonical?: string;
  /** Optional explicit FR counterpart URL */
  frenchCanonical?: string;
  /** Page primary language (default fr-CA) */
  lang?: "fr-CA" | "en-CA";
}

const SeoHead = ({
  title, description, canonical, noindex, ogImage, ogType = "website",
  englishCanonical, frenchCanonical, lang = "fr-CA",
}: SeoHeadProps) => {
  useEffect(() => {
    document.title = title;
    document.documentElement.lang = lang;

    const path = window.location.pathname;
    const canonicalUrl = canonical || `https://unpro.ca${path}`;
    const enUrl = englishCanonical || getEnglishCounterpart(path);
    const frUrl = frenchCanonical || getFrenchCounterpart(path);

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
    if (noindex) setMeta("robots", "noindex, nofollow");
    else document.querySelector('meta[name="robots"]')?.remove();

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;

    // hreflang — FR + EN + x-default
    const setHreflang = (code: string, href: string) => {
      let el = document.querySelector(`link[rel="alternate"][hreflang="${code}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.rel = "alternate";
        el.setAttribute("hreflang", code);
        document.head.appendChild(el);
      }
      el.href = href;
    };
    setHreflang("fr-CA", frUrl);
    setHreflang("en-CA", enUrl);
    setHreflang("x-default", frUrl);

    // OG
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", "UNPRO", "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("og:locale", lang === "en-CA" ? "en_CA" : "fr_CA", "property");
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
      setMeta("og:image:width", "1200", "property");
      setMeta("og:image:height", "630", "property");
    }

    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);
  }, [title, description, canonical, noindex, ogImage, ogType, englishCanonical, frenchCanonical, lang]);

  return null;
};

export default SeoHead;
