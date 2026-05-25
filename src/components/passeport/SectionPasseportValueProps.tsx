/**
 * SectionPasseportValueProps
 * Bannière narrative "Passeport Maison = Carfax de l'habitation"
 * + 5 piliers + bloc Indice Qualité UNPRO.
 * Design: Cinematic Dark, glass cards, semantic tokens.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  FileCheck2,
  Receipt,
  Gauge,
  Sparkles,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

const PILLARS = [
  {
    icon: FileCheck2,
    title: "Prouver vos rénovations",
    desc: "Factures, photos avant/après, matériaux, dates. Vos investissements deviennent démontrables.",
  },
  {
    icon: ShieldCheck,
    title: "Réduire les risques acheteur",
    desc: "Moins d'incertitude, moins de négociation à la baisse, transactions plus rapides.",
  },
  {
    icon: BadgeCheck,
    title: "Protéger vos garanties",
    desc: "Toutes vos garanties au même endroit, datées et liées à un entrepreneur vérifié.",
  },
  {
    icon: Receipt,
    title: "Prouver les taxes payées",
    desc: "TPS/TVQ documentées. Protection mutuelle propriétaire et entrepreneur.",
  },
  {
    icon: Gauge,
    title: "Bâtir un véritable Score Maison",
    desc: "Indice Qualité UNPRO basé sur l'entretien, la conformité et la prévention.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function SectionPasseportValueProps() {
  return (
    <section className="relative border-b border-border/60 bg-card/40 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Nouveau · Le Carfax de votre maison
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-4 max-w-3xl text-3xl md:text-5xl font-bold leading-[1.05] tracking-tight text-foreground"
        >
          Votre maison vaut ce que vous pouvez{" "}
          <span className="text-gradient">prouver</span>.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-4 max-w-2xl text-base md:text-lg leading-relaxed text-muted-foreground"
        >
          Le Passeport Maison UNPRO est un dossier vivant qui conserve factures,
          garanties, photos, preuves de taxes et historique d'entretien.
          Chaque pièce ajoutée fait monter votre <strong className="text-foreground">Indice Qualité UNPRO</strong> —
          et la valeur démontrable de votre propriété.
        </motion.p>

        {/* Pillars */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              className="group relative rounded-2xl border border-border/70 bg-background/40 p-5 backdrop-blur-md transition-all duration-[420ms] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background/60"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <p.icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">{p.title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Indice Qualité block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-10 grid gap-6 rounded-3xl border border-border/70 bg-gradient-to-br from-primary/5 via-background/40 to-accent/5 p-6 md:p-8 lg:grid-cols-[1.4fr_1fr]"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Indice Qualité UNPRO
            </div>
            <h3 className="mt-3 text-2xl md:text-3xl font-bold leading-tight text-foreground">
              Comme un dossier de crédit, mais pour votre maison.
            </h3>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-muted-foreground">
              Notre Indice combine l'historique des travaux, la conformité, la
              fréquence des entretiens, la qualité des entrepreneurs et la
              prévention. Une propriété entretenue intelligemment devient plus
              désirable et plus crédible sur le marché.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/dashboard/property"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elevation transition-all duration-[420ms] hover:-translate-y-0.5"
              >
                Ouvrir mon Passeport
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/blog/passeport-maison-carfax-habitation"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur-md transition-all duration-[420ms] hover:-translate-y-0.5 hover:border-primary/40"
              >
                Lire l'article fondateur
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/50 p-5 backdrop-blur-md">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Niveau Documentation
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-foreground tabular-nums">87</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{ width: "87%" }}
              />
            </div>
            <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
              <li className="flex justify-between gap-3">
                <span>Garanties actives</span>
                <span className="text-foreground">5</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Travaux documentés</span>
                <span className="text-foreground">12</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Entrepreneurs RBQ vérifiés</span>
                <span className="text-foreground">4</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Inspections annuelles</span>
                <span className="text-foreground">3</span>
              </li>
            </ul>
            <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground/70">
              Exemple illustratif
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
