import { motion } from "framer-motion";
import { ShieldCheck, Users, MapPin, Target, BarChart3, Handshake, UserCheck } from "lucide-react";

const points = [
  { icon: Users, text: "Nombre limité par ville" },
  { icon: ShieldCheck, text: "Possibilité d'exclusivité" },
  { icon: Target, text: "Matching selon domaine" },
  { icon: MapPin, text: "Matching selon localisation" },
  { icon: BarChart3, text: "Matching selon objectifs" },
  { icon: Handshake, text: "Matching selon capacité" },
  { icon: UserCheck, text: "Clients plus compatibles" },
];

export default function SectionNoSharedLeads() {
  return (
    <section className="py-16 px-4 bg-card/40">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display mb-3">
            Pas de leads partagés.
            <br />
            <span className="text-primary">Pas de course contre 5 concurrents.</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            UNPRO ne fonctionne pas comme une machine à leads partagés. Le système limite le nombre d'entrepreneurs par ville, par domaine et par territoire.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {points.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 flex flex-col items-center gap-2 text-center"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <p.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground">{p.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
