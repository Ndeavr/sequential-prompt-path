/**
 * UNPRO — SEO FAQ Section
 * Renders FAQ accordion with JSON-LD structured data.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SeoFaq } from "../data/faqs";
import { useEffect } from "react";
import EnrichedFaqAnswer from "@/components/grants/EnrichedFaqAnswer";

interface SeoFaqSectionProps {
  faqs: SeoFaq[];
  heading?: string;
}

const SeoFaqSection = ({ faqs, heading = "Questions fréquentes" }: SeoFaqSectionProps) => {
  // Inject JSON-LD
  useEffect(() => {
    if (faqs.length === 0) return;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(jsonLd);
    script.id = "seo-faq-jsonld";
    const existing = document.getElementById("seo-faq-jsonld");
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [faqs]);

  if (faqs.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-4">{heading}</h2>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-foreground">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>
              <EnrichedFaqAnswer text={faq.answer} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default SeoFaqSection;
