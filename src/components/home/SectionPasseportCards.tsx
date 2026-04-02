/**
 * SectionPasseportCards — Passeport Maison / Condo / Entrepreneur entry cards.
 */
import { motion } from "framer-motion";
import { Home as HomeIcon, Building, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const CARDS = [
  {
    icon: HomeIcon,
    title: "Passeport Maison",
    desc: "Documents, historique, valeur, travaux",
    cta: "Ouvrir",
    route: "/dashboard/property",
    color: "text-primary",
    bgColor: "bg-primary/8",
  },
  {
    icon: Building,
    title: "Passeport Condo",
    desc: "Gestion copropriété, conformité",
    cta: "Ouvrir",
    route: "/dashboard/syndicate",
    color: "text-secondary",
    bgColor: "bg-secondary/8",
  },
  {
    icon: Briefcase,
    title: "Entrepreneur",
    desc: "Profil IA, rendez-vous qualifiés",
    cta: "Accéder",
    route: "/pro",
    color: "text-accent",
    bgColor: "bg-accent/8",
  },
];

export default function SectionPasseportCards() {
  return (
    <section className="px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ staggerChildren: 0.08 }}
          className="grid grid-cols-3 gap-3"
        >
          {CARDS.map((card, i) => (
            <motion.div key={card.title} variants={fadeUp} custom={i}>
              <Link
                to={card.route}
                className="glass-card rounded-2xl p-3 sm:p-4 h-full flex flex-col text-center hover:shadow-lg transition-all group"
              >
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${card.bgColor} flex items-center justify-center mx-auto mb-2`}>
                  <card.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
                </div>
                <p className="font-display text-xs sm:text-sm font-bold text-foreground leading-tight">{card.title}</p>
                <p className="text-[10px] sm:text-xs mt-1 text-muted-foreground leading-snug hidden sm:block">{card.desc}</p>
                <div className="mt-auto pt-2">
                  <span className={`inline-block text-[10px] sm:text-xs font-bold ${card.color} group-hover:underline`}>
                    {card.cta}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
