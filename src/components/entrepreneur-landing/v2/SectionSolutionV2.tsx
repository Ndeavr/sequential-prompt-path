/** Business preferences used to find suitable projects. */
import { motion } from "framer-motion";
import { useLanguage } from "@/components/ui/LanguageToggle";

const SOLUTIONS = {
  fr: ["Vos spécialités au cœur du jumelage", "Votre territoire et vos disponibilités pris en compte", "Les mandats que vous aimez faire mis de l’avant", "Vos exclusions précisées dès le départ", "Des besoins clients mieux compris avant l’échange", "Un profil qui présente clairement votre expertise"],
  en: ["Your specialties guide the match", "Your service area and availability matter", "The work you want to do comes first", "Your exclusions are clear from the start", "Customer needs are clarified before the conversation", "A profile that clearly presents your expertise"],
};

export default function SectionSolutionV2() {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  return (
    <section className="px-5 py-12">
      <div className="max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-6"
        >
          {fr ? "Plus de place pour les projets qui vous conviennent" : "Make room for projects that fit your business"}
        </motion.h2>

        <div className="space-y-2.5">
          {SOLUTIONS[fr ? "fr" : "en"].map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-success/20 bg-success/5 backdrop-blur-sm"
            >
              <span className="text-success text-lg leading-none shrink-0">✓</span>
              <span className="text-sm text-foreground/90 font-medium">{s}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
