import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";

const cards = [
  { icon: DollarSign, title: "10 rencontres / semaine", desc: "1 500$ à 3 000$", sub: "en commissions mensuelles" },
  { icon: TrendingUp, title: "30 entrepreneurs activés", desc: "Revenus récurrents", sub: "qui s'accumulent mois après mois" },
  { icon: Wallet, title: "Ton portefeuille clients", desc: "Te génère du passif", sub: "même quand tu ne travailles pas" },
];

export default function ProofSectionEarnings() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-display font-bold text-center text-foreground mb-12"
        >
          Potentiel de revenus
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-2xl border border-border/60 bg-card p-6 text-center space-y-3 hover:shadow-lg transition-shadow"
            >
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground">{card.title}</p>
              <p className="text-2xl font-display font-bold text-primary">{card.desc}</p>
              <p className="text-sm text-muted-foreground">{card.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
