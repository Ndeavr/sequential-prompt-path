
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const FAQS = [
  { q: "Pourquoi limiter à 30 places ?", a: "Pour garantir que chaque fondateur reçoive un volume de projets rentable. Plus de pros = moins de projets chacun." },
  { q: "Est-ce vraiment exclusif ?", a: "Oui. Le compteur est en temps réel. Quand 30 places sont prises, le plan ferme définitivement." },
  { q: "Que se passe-t-il après 30 ?", a: "Le plan est fermé. Aucune exception. Les futurs entrepreneurs devront passer par les plans standards." },
  { q: "Puis-je payer en plusieurs fois ?", a: "Contactez-nous pour discuter d'options de financement. Le prix total reste identique." },
  { q: "Que se passe-t-il si je ne prends pas ?", a: "Un autre entrepreneur prendra votre territoire. Une fois verrouillé, c'est pour 10 ans." },
];

export default function SectionFAQFounderPlans() {
  return (
    <section className="px-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-bold text-center text-foreground"
        >
          Questions fréquentes
        </motion.h2>

        <Accordion type="single" collapsible className="space-y-2">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border/30 rounded-xl px-4 bg-card/30 backdrop-blur">
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
