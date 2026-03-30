import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marc-Antoine L.",
    role: "Étudiant en admin, Montréal",
    quote: "J'ai fait 2 200$ mon premier mois, à temps partiel. Pas de cold call, juste des rencontres déjà bookées.",
  },
  {
    name: "Sarah B.",
    role: "Job d'été, Québec",
    quote: "Le plus beau c'est que mes clients d'été me paient encore chaque mois. Mes revenus continuent même pendant la session.",
  },
  {
    name: "Julien T.",
    role: "Temps partiel, Laval",
    quote: "Je fais 5 rencontres par semaine entre mes cours. C'est flexible, le produit se vend tout seul avec l'IA.",
  },
];

export default function TestimonialsSectionCloser() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-display font-bold text-center text-foreground mb-12"
        >
          Ce qu'ils en disent
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border/60 bg-card p-6 space-y-4"
            >
              <Quote className="h-5 w-5 text-primary/40" />
              <p className="text-foreground leading-relaxed">{t.quote}</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
