import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "C'est quoi le score de visibilité IA ?",
    a: "C'est une analyse de comment les moteurs de recherche IA (ChatGPT, Gemini, Perplexity) perçoivent votre entreprise quand un client potentiel pose une question.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Le score est gratuit. Les plans commencent à partir de 99$/mois pour recevoir des rendez-vous qualifiés.",
  },
  {
    q: "C'est quoi la différence avec les leads ?",
    a: "UNPRO ne vend pas de leads. Vous recevez des rendez-vous qualifiés avec des clients qui ont un besoin réel et confirmé.",
  },
  {
    q: "Comment Alex fonctionne ?",
    a: "Alex est un assistant IA qui parle français québécois. Il analyse votre entreprise, recommande le bon plan et peut finaliser l'activation directement par voix ou chat.",
  },
  {
    q: "Est-ce que je peux essayer avant de m'engager ?",
    a: "Oui. Le score est gratuit et sans engagement. Vous pouvez parler à Alex autant que vous voulez avant de décider.",
  },
];

export default function SectionFAQContractorOnboarding() {
  return (
    <section className="px-4 py-10 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-center mb-4">Questions fréquentes</h2>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-sm text-left">{f.q}</AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
