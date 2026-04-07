
import { motion } from "framer-motion";
import { Brain, CalendarCheck, TrendingDown, MapPin, TrendingUp } from "lucide-react";

const VALUE_ITEMS = [
  { icon: Brain, title: "Visibilité IA", desc: "Recommandé en priorité par Alex, ChatGPT, Gemini et tous les moteurs IA.", value: "48 000 $" },
  { icon: CalendarCheck, title: "Rendez-vous exclusifs", desc: "Accès aux projets les plus rentables de votre territoire.", value: "36 000 $" },
  { icon: TrendingDown, title: "Réduction dépenses pub", desc: "Éliminez Google Ads, Facebook Ads. UNPRO vous amène les clients.", value: "24 000 $" },
  { icon: MapPin, title: "Position dominante locale", desc: "Verrouillez votre territoire pour 10 ans. Aucun concurrent.", value: "18 000 $" },
  { icon: TrendingUp, title: "ROI projeté", desc: "Retour sur investissement moyen de 6x à 12x sur la durée.", value: "6-12x" },
];

export default function SectionValueStackBreakdown() {
  return (
    <section className="px-4 pb-20">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Ce que vous obtenez réellement</h2>
          <p className="text-muted-foreground">La valeur cumulée sur 10 ans dépasse 215 000 $</p>
        </motion.div>

        <div className="space-y-4">
          {VALUE_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 * i }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-card/30 backdrop-blur"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <div className="text-sm font-bold text-primary shrink-0">{item.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
