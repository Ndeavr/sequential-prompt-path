import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Est-ce que je dois refaire mon site web?", a: "Non. UNPRO crée automatiquement votre profil optimisé pour l'IA à partir de vos données existantes." },
  { q: "Est-ce que je dois tout repartir mon SEO?", a: "Non. Le système optimise votre visibilité IA sans que vous ayez à toucher au SEO vous-même." },
  { q: "Est-ce que ce sont des leads partagés?", a: "Non. Chaque demande est envoyée à un seul entrepreneur à la fois. Pas de course contre 5 concurrents." },
  { q: "Comment UNPRO choisit les clients pour moi?", a: "L'IA analyse le domaine, la localisation, la capacité et les objectifs pour envoyer les clients les plus compatibles." },
  { q: "Comment fonctionne Alex?", a: "Alex est une IA conversationnelle qui vous guide à chaque étape : score, revenus perdus, plan recommandé, activation." },
  { q: "Comment le plan est recommandé?", a: "Le système calcule le plan optimal basé sur vos objectifs de revenus, votre capacité et votre marché." },
  { q: "Est-ce qu'il y a de l'exclusivité?", a: "Oui. Selon votre ville et votre domaine, vous pouvez obtenir une zone exclusive sans concurrence directe." },
  { q: "Est-ce que je peux voir mon score avant de payer?", a: "Oui. L'évaluation initiale est gratuite. Vous voyez votre score et vos revenus perdus avant tout engagement." },
  { q: "Comment savoir ce que je laisse sur la table?", a: "Le système calcule automatiquement les revenus potentiels manqués basés sur votre domaine et votre zone." },
  { q: "Est-ce que ça fonctionne dans ma ville?", a: "UNPRO couvre les principales villes du Québec. Vérifiez la disponibilité directement sur cette page." },
];

export default function SectionFAQEntrepreneurs() {
  return (
    <section className="py-16 px-4 bg-card/40">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display mb-2">
            Questions fréquentes
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border/40 bg-card/80 px-4">
              <AccordionTrigger className="text-sm font-semibold text-foreground text-left py-3 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pb-3">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
