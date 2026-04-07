import { motion } from "framer-motion";
import { Upload, Brain, MessageCircle, Target, Rocket } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Import rapide",
    desc: "Carte d'affaires, logo, site web, fiche Google — on s'occupe du reste.",
  },
  {
    icon: Brain,
    title: "Profil AIPP intelligent",
    desc: "L'IA crée votre profil de confiance, vos signaux et votre structure.",
  },
  {
    icon: MessageCircle,
    title: "Consultation avec Alex",
    desc: "Alex vous montre votre score, vos pertes, et vous guide vers le bon plan.",
  },
  {
    icon: Target,
    title: "Objectifs et plan",
    desc: "Combien vous voulez faire, combien de rendez-vous, quel plan choisir.",
  },
  {
    icon: Rocket,
    title: "Activation",
    desc: "Paiement, activation, démarrage. Vous recevez vos premiers rendez-vous.",
  },
];

export default function SectionHowItWorks() {
  return (
    <section className="py-16 px-4 bg-card/40">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display mb-2">
            Comment ça fonctionne
          </h2>
          <p className="text-muted-foreground text-sm">5 étapes vers vos premiers rendez-vous qualifiés.</p>
        </motion.div>

        <div className="space-y-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-4 p-4 rounded-2xl border border-border/40 bg-card/80"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground mb-0.5">
                  <span className="text-primary mr-1.5">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
