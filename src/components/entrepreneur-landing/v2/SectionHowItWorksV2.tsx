/** Three steps explaining the matching approach. */
import { motion } from "framer-motion";
import { useLanguage } from "@/components/ui/LanguageToggle";

const STEPS = {
  fr: [
    { n: 1, title: "Vous décrivez les mandats recherchés", body: "Spécialités, territoire, disponibilités, préférences et objectifs : votre profil explique ce qui convient à votre entreprise." },
    { n: 2, title: "Clara précise les besoins des propriétaires", body: "Les informations du projet servent à rechercher une compatibilité avec les services et les critères de votre entreprise." },
    { n: 3, title: "Vous préparez des échanges plus utiles", body: "Le but : mieux cibler vos efforts de vente, réduire les allers-retours et consacrer plus de temps aux travaux qui vous conviennent." },
  ],
  en: [
    { n: 1, title: "Describe the projects you want", body: "Your specialties, service area, availability, preferences and goals tell us what fits your business." },
    { n: 2, title: "Clara clarifies homeowner needs", body: "Project information helps identify a fit with your services and business criteria." },
    { n: 3, title: "Prepare for more useful conversations", body: "The goal: focus your sales effort, reduce back-and-forth and spend more time on the work you want." },
  ],
};

export default function SectionHowItWorksV2() {
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
          {fr ? "Concrètement, comment ça marche?" : "How does it work?"}
        </motion.h2>

        <ol className="space-y-3">
          {STEPS[fr ? "fr" : "en"].map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 px-4 py-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                {s.n}
              </div>
              <div><h3 className="text-sm sm:text-base text-foreground font-medium">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p></div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
