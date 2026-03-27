import { motion } from "framer-motion";
import FAQSection from "@/components/shared/FAQSection";

const faqItems = [
  {
    question: "Dois-je prospecter?",
    answer: "Non. Les rendez-vous sont déjà dans ton agenda. Tu n'as pas besoin de faire du cold call, du porte-à-porte ou du démarchage. On s'occupe de tout ça pour toi.",
  },
  {
    question: "Dois-je être expert en vente?",
    answer: "Non. L'IA fait le gros du travail. Tu crées le profil de l'entrepreneur en direct avec lui, et le système s'occupe de l'analyse, du scoring et des recommandations. Tu as juste besoin d'être humain, à l'écoute et organisé.",
  },
  {
    question: "C'est quoi exactement le produit que je vends?",
    answer: "Tu ne vends pas des leads, des clics ou de la pub. Tu offres aux entrepreneurs un système qui leur amène des rendez-vous qualifiés directement dans leur agenda. Pas de compétition avec 3-4 autres entreprises. Un vrai rendez-vous, un vrai client.",
  },
  {
    question: "C'est un job d'été seulement?",
    answer: "Non! C'est flexible. Job d'été, temps partiel pendant les études, ou à temps plein si tu veux. Remote, en personne, ou hybride — c'est toi qui choisis ton rythme.",
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
