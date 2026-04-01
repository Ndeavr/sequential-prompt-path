import { motion } from "framer-motion";
import FAQSection from "@/components/shared/FAQSection";

const faqItems = [
  {
    question: "Dois-je prospecter moi-même?",
    answer: "Non. Les rendez-vous avec les entrepreneurs sont déjà planifiés dans ton agenda. Tu n'as pas à trouver les clients toi-même.",
  },
  {
    question: "Dois-je être expert en vente?",
    answer: "Non. L'IA fait le gros du travail. Tu crées le profil de l'entrepreneur en direct avec lui, et le système s'occupe de l'analyse, du scoring et des recommandations. Tu as juste besoin d'être à l'écoute et organisé.",
  },
  {
    question: "C'est quoi exactement ce que je fais comme rep?",
    answer: "Tu rencontres des entrepreneurs (plombiers, électriciens, etc.) en personne. Tu crées leur profil IA avec notre outil en 5 minutes. L'entrepreneur voit son score et ses opportunités, et s'active. Tu touches une commission à chaque activation — et chaque mois tant qu'il reste client.",
  },
  {
    question: "C'est un job d'été seulement?",
    answer: "Non! C'est flexible. Job d'été, temps partiel pendant les études, ou à temps plein si tu veux. Remote, en personne, ou hybride — c'est toi qui choisis ton rythme.",
  },
  {
    question: "Les entrepreneurs sont-ils vraiment intéressés?",
    answer: "Oui. On cible des entrepreneurs qui perdent déjà des clients en ligne. Quand tu leur montres leur score AIPP et ce qu'ils perdent chaque mois, le déclic est immédiat.",
  },
];

export default function ObjectionSection() {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <FAQSection title="Questions fréquentes" items={faqItems} />
        </motion.div>
      </div>
    </section>
  );
}
