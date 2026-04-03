/**
 * SectionHowItWorks — 3-step process with true glass cards.
 */
import { motion } from "framer-motion";
import { FileText, Brain, Trophy } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const STEPS = [
  { step: 1, icon: FileText, title: "Décrivez", subtitle: "votre projet", gradient: "from-primary to-primary/70" },
  { step: 2, icon: Brain, title: "UNPRO analyse", subtitle: "et recommande", gradient: "from-accent to-accent/70" },
  { step: 3, icon: Trophy, title: "Rencontrez", subtitle: "le bon entrepreneur", gradient: "from-warning to-warning/70" },
];

export default function SectionHowItWorks() {
  return (
    <section className="px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="section-title mb-8 text-center">Comment ça marche ?</h2>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {STEPS.map((item, i) => (
            <motion.div
              key={item.step}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="glass-card-elevated rounded-2xl p-3 sm:p-5 text-center h-full light-ray-fx">
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-[10px] font-black text-primary-foreground shadow-sm relative z-10">
                  {item.step}
                </div>
                <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center mx-auto mb-2 bg-gradient-to-br ${item.gradient} shadow-md`}>
                  <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <p className="font-display text-sm sm:text-base font-bold text-foreground">{item.title}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">{item.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
