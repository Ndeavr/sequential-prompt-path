import { motion } from "framer-motion";
import { CalendarDays, Target, DollarSign, RefreshCw, Rocket, XCircle } from "lucide-react";

const offers = [
  { icon: CalendarDays, title: "Rendez-vous déjà dans ton agenda", color: "text-primary" },
  { icon: Target, title: "Clients qualifiés et prêts à écouter", color: "text-primary" },
  { icon: DollarSign, title: "Bonus à chaque rencontre", color: "text-primary" },
  { icon: RefreshCw, title: "Commission récurrente (revenus passifs)", color: "text-primary" },
  { icon: Rocket, title: "Produit ultra actuel (IA)", color: "text-primary" },
  { icon: XCircle, title: "Pas de leads partagés, pas de clics, pas de SEO inutile", color: "text-destructive" },
];

export default function OfferGridSection() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-display font-bold text-center text-foreground mb-12"
        >
          Ce qu'on t'offre
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card"
            >
              <item.icon className={`h-5 w-5 shrink-0 mt-0.5 ${item.color}`} />
              <span className="text-sm font-medium text-foreground">{item.title}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
