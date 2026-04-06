import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Pourquoi plusieurs plans entrepreneurs ?",
    a: "Parce que chaque entreprise a une capacité, un budget et des objectifs différents.",
  },
  {
    q: "Les rendez-vous sont-ils partagés ?",
    a: "Non. Chaque projet est envoyé à un seul entrepreneur à la fois.",
  },
  {
    q: "Les rendez-vous sont-ils inclus ?",
    a: "Oui, selon le plan choisi. Le nombre varie d'un plan à l'autre.",
  },
  {
    q: "Puis-je acheter plus de rendez-vous ?",
    a: "Oui. À l'unité ou en bloc, selon votre plan et la disponibilité.",
  },
  {
    q: "Pourquoi certaines places sont limitées ?",
    a: "Pour éviter la saturation et protéger la valeur des rendez-vous dans chaque marché.",
  },
  {
    q: "Que comprend l'abonnement ?",
    a: "Votre profil, votre visibilité, votre score AIPP, vos outils et, selon le plan, des rendez-vous inclus.",
  },
  {
    q: "Puis-je changer de plan ?",
    a: "Oui. Vous pouvez ajuster votre plan selon votre croissance et votre capacité.",
  },
  {
    q: "Puis-je mettre mon abonnement en pause ?",
    a: "Oui. Mais une pause prolongée peut faire reculer votre visibilité et votre momentum.",
  },
  {
    q: "Comment sont calculés les prix des rendez-vous ?",
    a: "Ils varient selon le marché, la saison, la localité, la spécialité et la valeur du projet.",
  },
  {
    q: "Qu'est-ce qu'un territoire exclusif ?",
    a: "C'est une combinaison localité + spécialité réservée selon certaines conditions et certains plans.",
  },
  {
    q: "Que se passe-t-il si ma zone est complète ?",
    a: "L'accès peut être limité, mis en attente ou orienté vers une autre option selon la disponibilité.",
  },
  {
    q: "Puis-je choisir les projets que je veux recevoir ?",
    a: "Oui. Vos préférences, votre capacité et votre plan influencent les projets proposés.",
  },
];

const HOMEOWNER_FAQS = [
  {
    q: "L'analyse intelligente des soumissions est-elle gratuite ?",
    a: "Oui. Le plan Gratuit inclut 1 analyse par mois.",
  },
  {
    q: "Que comprend Propriétaire Plus ?",
    a: "Le plan Propriétaire Plus inclut notamment les analyses intelligentes des soumissions en illimité, en plus du Passeport Maison complet, du Score maison UNPRO et de l'historique des travaux.",
  },
  {
    q: "Puis-je comparer plusieurs soumissions avec le plan gratuit ?",
    a: "Oui. Vous pouvez déposer jusqu'à 3 soumissions dans une même analyse, avec 1 analyse incluse par mois dans le plan Gratuit. Pour un usage illimité, il faut passer à Propriétaire Plus.",
  },
];

function FaqItem({ faq, isOpen, onToggle }: { faq: { q: string; a: string }; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 md:p-5 text-left text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
      >
        {faq.q}
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-3", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 md:px-5 pb-4 md:pb-5 text-sm text-muted-foreground leading-relaxed"
        >
          {faq.a}
        </motion.div>
      )}
    </div>
  );
}

export default function PricingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="px-5 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold mb-4">
            <HelpCircle className="h-3.5 w-3.5" /> FAQ
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Questions fréquentes</h2>
        </motion.div>

        {/* Entrepreneur FAQs */}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Entrepreneurs</h3>
        <div className="space-y-2 mb-10">
          {FAQS.map((faq, i) => (
            <FaqItem key={i} faq={faq} isOpen={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
          ))}
        </div>

        {/* Homeowner FAQs */}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Propriétaires</h3>
        <div className="space-y-2">
          {HOMEOWNER_FAQS.map((faq, i) => {
            const idx = FAQS.length + i;
            return (
              <FaqItem key={idx} faq={faq} isOpen={openIdx === idx} onToggle={() => setOpenIdx(openIdx === idx ? null : idx)} />
            );
          })}
        </div>
      </div>
    </section>
  );
}
