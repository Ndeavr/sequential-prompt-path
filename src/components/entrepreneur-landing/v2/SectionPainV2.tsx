/** Common obstacles to focusing on suitable projects. */
import { motion } from "framer-motion";
import { useLanguage } from "@/components/ui/LanguageToggle";

const PAINS = {
  fr: ["Des demandes hors de votre territoire", "Des projets qui ne correspondent pas à vos spécialités", "Des soumissions préparées pour les mauvais mandats", "Des relances qui prennent la place des travaux"],
  en: ["Requests outside your service area", "Projects outside your specialties", "Quotes prepared for the wrong jobs", "Follow-ups that take time away from your work"],
};

export default function SectionPainV2() {
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
          {fr ? "Votre temps mérite de meilleurs projets" : "Your time deserves better projects"}
        </motion.h2>

        <div className="space-y-2.5">
          {PAINS[fr ? "fr" : "en"].map((pain, i) => (
            <motion.div
              key={pain}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-destructive/15 bg-destructive/5 backdrop-blur-sm"
            >
              <span className="text-destructive text-lg leading-none shrink-0">✕</span>
              <span className="text-sm text-foreground/90">{pain}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
