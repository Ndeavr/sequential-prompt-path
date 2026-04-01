import { motion } from "framer-motion";
import { MapPin, Clock, Smartphone, GraduationCap, TrendingUp, Users } from "lucide-react";

const offers = [
  { icon: MapPin, title: "Territoire exclusif — personne d'autre ne prospecte ta zone" },
  { icon: Clock, title: "Horaire flexible — temps partiel, été, ou plein temps" },
  { icon: Smartphone, title: "Outils IA fournis — tu crées le profil en 5 min" },
  { icon: GraduationCap, title: "Formation complète — Alex t'entraîne avant chaque RDV" },
  { icon: TrendingUp, title: "Commission récurrente — chaque client te paie chaque mois" },
  { icon: Users, title: "Pas de compétition — tu es le seul rep dans ta ville" },
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
          Ce qu'on t'offre comme rep
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
              <item.icon className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
              <span className="text-sm font-medium text-foreground">{item.title}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
