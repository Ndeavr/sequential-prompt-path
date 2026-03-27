/**
 * TrustProofSection — Social proof & stats for homepage V2.
 */
import { motion } from "framer-motion";
import { Star, ShieldCheck, Users, Calendar } from "lucide-react";

const stats = [
  { icon: ShieldCheck, value: "500+", label: "Entrepreneurs vérifiés" },
  { icon: Calendar, value: "10 000+", label: "Rendez-vous réalisés" },
  { icon: Star, value: "4.9/5", label: "Satisfaction clients" },
  { icon: Users, value: "25 000+", label: "Propriétaires aidés" },
];

export default function TrustProofSection() {
  return (
    <section className="px-5 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            La confiance, vérifiée.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-card border border-border/60 p-4 text-center space-y-2 hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-display text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Avatars row */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <div className="flex -space-x-2">
            {[
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
            ].map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="h-8 w-8 rounded-full border-2 border-card object-cover"
                loading="lazy"
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-3.5 w-3.5 fill-current text-warning" />
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-medium">2 500+ avis</span>
        </motion.div>
      </div>
    </section>
  );
}
