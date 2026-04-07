import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = [
  { q: "Comment calculez-vous le nombre de rendez-vous requis ?", a: "On divise votre objectif mensuel par la valeur moyenne fermée par rendez-vous, ajustée avec un taux de fermeture amélioré grâce au matching UNPRO." },
  { q: "Comment calculez-vous ce que je laisse sur la table ?", a: "On multiplie votre revenu actuel par des facteurs de potentiel liés à votre score, votre ville, votre secteur et votre capacité. La différence, c'est ce que vous perdez." },
  { q: "Est-ce que les leads sont partagés ?", a: "Non. UNPRO ne partage pas le même client à plusieurs entrepreneurs. Chaque rendez-vous est mieux ciblé, plus exclusif." },
  { q: "Comment le plan exact est-il choisi ?", a: "En fonction de vos rendez-vous requis, du mix de projets, de votre capacité et de la rareté dans votre territoire." },
  { q: "Pourquoi ma ville influence-t-elle le résultat ?", a: "Certaines villes ont une demande plus forte et des marges différentes. Le système ajuste les projections selon les données locales." },
  { q: "Pourquoi mon secteur influence-t-il le plan ?", a: "Chaque domaine a une valeur moyenne de contrat, un taux de fermeture et un niveau de demande différent." },
  { q: "Puis-je avoir l'exclusivité ?", a: "Oui, avec les plans Élite et Signature, l'exclusivité territoriale est possible selon la disponibilité." },
  { q: "Est-ce que je peux faire le calcul sans représentant ?", a: "Absolument. Cette page est conçue pour ça. Vous entrez vos chiffres, le système calcule tout." },
  { q: "Est-ce que mon score pré-UNPRO change la projection ?", a: "Oui. Un score plus bas signifie plus de potentiel d'amélioration, donc des projections plus optimistes." },
  { q: "Est-ce que moins de soumissions peut vraiment donner plus de contrats ?", a: "Oui. Des rendez-vous mieux ciblés = meilleur taux de fermeture = plus de contrats avec moins de bruit." },
];

export default function SectionFAQGoalToPlan() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-8">Questions fréquentes</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`q-${i}`} className="rounded-xl border border-border/50 bg-card/60 px-4">
              <AccordionTrigger className="text-sm text-foreground hover:no-underline">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
