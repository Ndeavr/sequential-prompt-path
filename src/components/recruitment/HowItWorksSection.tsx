import { motion } from "framer-motion";
import { CalendarCheck, Coffee, Sparkles, BadgeDollarSign } from "lucide-react";

const steps = [
  { icon: CalendarCheck, title: "On remplit ton agenda", desc: "de rendez-vous qualifiés" },
  { icon: Coffee, title: "Tu rencontres l'entrepreneur", desc: "café, chantier, bureau — toi qui choisis" },
  { icon: Sparkles, title: "Tu crées son profil IA", desc: "en direct avec lui, simple et rapide" },
  { icon: BadgeDollarSign, title: "Tu gagnes à vie", desc: "commission récurrente sur chaque client" },
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-display font-bold text-center text-foreground mb-14"
        >
          Ce que tu fais concrètement
        </motion.h2>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />

          <div className="space-y-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Étape {i + 1}</span>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
