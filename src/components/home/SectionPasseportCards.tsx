/**
 * SectionPasseportCards — Passeport Maison / Condo / Entrepreneur entry cards.
 * True glass with light sweep and strong contrast.
 */
import { motion } from "framer-motion";
import { Home as HomeIcon, Building, Briefcase, ArrowRight } from "lucide-react";
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
    gradient: "from-primary to-primary/70",
  },
  {
    icon: Building,
    title: "Passeport Condo",
    desc: "Gestion copropriété, conformité",
    cta: "Ouvrir",
    route: "/dashboard/syndicate",
    gradient: "from-secondary to-secondary/70",
  },
  {
    icon: Briefcase,
    title: "Entrepreneur",
    desc: "Profil IA, rendez-vous qualifiés",
    cta: "Accéder",
    route: "/pro",
    gradient: "from-accent to-accent/70",
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
                className="glass-card-elevated rounded-2xl p-3 sm:p-4 h-full flex flex-col text-center group light-ray-fx"
              >
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mx-auto mb-2 shadow-md relative z-10`}>
                  <card.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <p className="font-display text-xs sm:text-sm font-bold text-foreground leading-tight relative z-10">{card.title}</p>
                <p className="text-[10px] sm:text-xs mt-1 text-muted-foreground leading-snug hidden sm:block relative z-10">{card.desc}</p>
                <div className="mt-auto pt-2 relative z-10">
                  <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-primary group-hover:underline">
                    {card.cta} <ArrowRight className="h-3 w-3" />
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
