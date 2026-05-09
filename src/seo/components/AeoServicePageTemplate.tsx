/**
 * UNPRO — AEO Service Page Template
 * Enforces the May 2026 blueprint:
 *  - H1 + H2 (exact question) + 2-sentence answer first
 *  - Price anchor table
 *  - City/neighborhood/postal-prefix in first 100 words
 *  - 5-8 FAQ block (FAQPage JSON-LD via SchemaStack)
 *  - Internal links (3+)
 *  - Before/after gallery slot with structured alt
 */
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface PriceRow { label: string; range: string; }
interface FaqItem { question: string; answer: string; }
interface InternalLink { to: string; label: string; }

interface Props {
  title: string;          // SEO <title>
  description: string;    // meta description
  canonical: string;      // full canonical URL
  h1: string;
  question: string;       // first H2 — verbatim search query
  answer: string;         // 2-sentence answer (first thing AI extracts)
  service: string;
  city: string;
  region?: string;
  postalPrefix?: string;
  neighborhood?: string;
  priceTable: PriceRow[];
  faqs: FaqItem[];
  internalLinks: InternalLink[];
  breadcrumbs: { name: string; url: string }[];
  beforeAfter?: { src: string; alt: string }[];
  ctaHref?: string;
  children?: ReactNode;
}

export default function AeoServicePageTemplate({
  title, description, canonical, h1, question, answer,
  service, city, region, postalPrefix, neighborhood,
  priceTable, faqs, internalLinks, breadcrumbs, beforeAfter, ctaHref = "/alex", children,
}: Props) {
  // First-100-words geo signal block (rendered as intro paragraph below answer)
  const geoLine = [
    `Service offert à ${city}${neighborhood ? `, secteur ${neighborhood}` : ""}.`,
    region ? `Région : ${region}.` : "",
    postalPrefix ? `Code postal : ${postalPrefix}.` : "",
  ].filter(Boolean).join(" ");

  return (
    <MainLayout>
      <SeoHead title={title} description={description} canonical={canonical} />
      <SchemaStack breadcrumbs={breadcrumbs} faqs={faqs} />

      <article className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Breadcrumb visual */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link to={c.url.replace("https://unpro.ca", "")} className="hover:underline">{c.name}</Link>
              ) : (
                <span className="text-foreground">{c.name}</span>
              )}
            </span>
          ))}
        </nav>

        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{h1}</h1>
        </header>

        {/* AEO answer block — what AI extracts */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">{question}</h2>
          <p className="text-lg text-foreground leading-relaxed font-medium">{answer}</p>
          <p className="text-muted-foreground">{geoLine}</p>
        </section>

        {/* Price anchor table */}
        {priceTable.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Prix indicatifs à {city} (2026)</h2>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold">Type de travaux</th>
                      <th className="text-right p-3 font-semibold">Fourchette CAD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceTable.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="p-3 text-foreground">{row.label}</td>
                        <td className="p-3 text-right text-foreground font-mono">{row.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        )}

        {/* CTA — single recommendation, direct booking (Concierge Décisif) */}
        <section className="bg-primary/5 border border-primary/20 rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
          <div>
            <p className="font-semibold text-foreground">Trouver le bon expert pour {service} à {city}</p>
            <p className="text-sm text-muted-foreground mt-1">Recommandation IA en moins de 5 secondes.</p>
          </div>
          <Button asChild>
            <Link to={ctaHref}>Parler à Alex <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </section>

        {/* Optional extra body */}
        {children}

        {/* Before/After gallery */}
        {beforeAfter && beforeAfter.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Réalisations à {city}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {beforeAfter.map((img, i) => (
                <img key={i} src={img.src} alt={img.alt} loading="lazy"
                     className="w-full aspect-square object-cover rounded-lg border border-border" />
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Questions fréquentes</h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details key={i} className="bg-card border border-border rounded-lg p-4 group">
                  <summary className="font-semibold text-foreground cursor-pointer">{f.question}</summary>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Internal links */}
        {internalLinks.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">À découvrir aussi</h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {internalLinks.map((l, i) => (
                <li key={i}>
                  <Link to={l.to}
                        className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition text-sm text-foreground">
                    <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </MainLayout>
  );
}
