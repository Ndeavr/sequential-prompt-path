import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { SEASONALITY_NOTE } from "@/lib/pricing/appointmentGuarantee";

const FAQS = [
  {
    q: "Combien de revenus puis-je espérer générer ?",
    a: "Le calcul dépend de votre panier moyen, de votre taux de fermeture et de la cadence de rendez-vous de votre forfait. Votre plan personnalisé affiche l'estimation établie à partir de vos propres chiffres, jamais d'une moyenne générique.",
  },

  {
    q: "Vendez-vous des leads partagés ?",
    a: "Non. Chaque projet est envoyé à un seul entrepreneur à la fois. Pas de guerre de prix, pas de course aux soumissions, pas de leads recyclés.",
  },
  {
    q: "Quelle est la vitesse d'activation ?",
    a: "Le jour même après l'onboarding. Votre profil, votre matching et vos premières opportunités sont prêts en quelques minutes.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui. Aucun engagement long. Vous pouvez ajuster, suspendre ou annuler votre plan selon les conditions affichées au moment du choix.",
  },
  {
    q: "Les rendez-vous sont-ils inclus dans le prix ?",
    a: "Oui. Chaque forfait inclut une cadence mensuelle indicative et une garantie calculée sur 12 mois — par exemple, une cadence de 5 rendez-vous par mois correspond à 60 rendez-vous qualifiés garantis sur 12 mois. Le nombre exact de votre forfait est affiché avant le paiement. Vous pouvez aussi acheter des rendez-vous supplémentaires à l'unité ou en bloc.",
  },
  {
    q: "La garantie est-elle mensuelle ou annuelle ?",
    a: SEASONALITY_NOTE,
  },
  {
    q: "Pourquoi payer plus qu'un lead partagé à environ 35 $ ?",
    a: "Un lead à 35 $ est souvent partagé : plusieurs entrepreneurs reçoivent le même client et vous devez le joindre, le relancer et compétitionner. Un rendez-vous UNPRO est exclusif, jamais partagé, et préqualifié selon le projet, le territoire, le service recherché et l'échéancier. Vous ne payez pas un nom et un numéro, mais un rendez-vous beaucoup plus près d'une décision.",
  },

  {
    q: "Que se passe-t-il si ma zone est complète ?",
    a: "Certaines combinaisons spécialité + ville sont limitées pour préserver la qualité. Le plan Signature donne accès à une priorité territoriale et à des options d'exclusivité par zone.",
  },
  {
    q: "Ai-je besoin d'un site web ?",
    a: "Non. Votre profil UNPRO sert de présence professionnelle complète, optimisée pour la recherche IA et la conversion.",
  },
  {
    q: "Puis-je changer de plan ?",
    a: "Oui. Vous pouvez monter ou descendre de plan à tout moment selon votre capacité réelle et vos objectifs de croissance.",
  },
  {
    q: "Combien coûte un rendez-vous supplémentaire ?",
    a: "De 15 $ à 500 $ selon la taille du projet (S, M, L, XL, XXL). La valeur typique d'un projet dépasse largement le coût d'un rendez-vous.",
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
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="px-5 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold mb-4">
            <HelpCircle className="h-3.5 w-3.5" /> FAQ
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Questions fréquentes</h2>
          <p className="text-muted-foreground mt-2 text-sm">Tout ce que les entrepreneurs nous demandent avant de démarrer.</p>
        </motion.div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <FaqItem key={i} faq={faq} isOpen={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}
