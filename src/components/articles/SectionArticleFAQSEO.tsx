/**
 * UNPRO — SectionArticleFAQSEO
 * FAQ section with JSON-LD FAQPage injection for SEO/AEO.
 */
import { useEffect } from "react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  faqs: FaqItem[];
  heading?: string;
}

export default function SectionArticleFAQSEO({ faqs, heading = "Questions fréquentes" }: Props) {
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
    script.id = "article-faq-jsonld";
    script.text = JSON.stringify(jsonLd);
    const existing = document.getElementById("article-faq-jsonld");
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [faqs]);

  if (faqs.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">{heading}</h2>
      </div>
      <Accordion type="single" collapsible className="space-y-0">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border/30">
            <AccordionTrigger className="text-sm font-medium text-foreground py-4 hover:no-underline text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
