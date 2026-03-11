/**
 * UNPRO — Energy Savings Landing Page
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Home,
  Wind,
  Thermometer,
  ArrowRight,
  Zap,
  DollarSign,
  Shield,
  ChevronRight,
  BadgeCheck,
  Flame,
  Snowflake,
  Sun,
} from "lucide-react";

/* ─── Animated rotating titles ─── */
const rotatingTitles = [
  "améliorez l'isolation",
  "optimisez la ventilation",
  "découvrez les subventions disponibles",
];

function RotatingText() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % rotatingTitles.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="inline-block h-[1.3em] overflow-hidden align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="block text-primary"
        >
          {rotatingTitles[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ─── Energy loss data ─── */
const energyLosses = [
  {
    icon: Home,
    title: "Toiture",
    pct: "25–30 %",
    color: "from-destructive/20 to-destructive/5",
    iconColor: "text-destructive",
    desc: "La chaleur monte. Une toiture mal isolée laisse s'échapper jusqu'à 30 % de l'énergie de chauffage.",
  },
  {
    icon: Sun,
    title: "Fenêtres",
    pct: "15–20 %",
    color: "from-warning/20 to-warning/5",
    iconColor: "text-warning",
    desc: "Des fenêtres simple vitrage ou mal scellées créent des ponts thermiques importants.",
  },
  {
    icon: Snowflake,
    title: "Isolation",
    pct: "20–25 %",
    color: "from-accent/20 to-accent/5",
    iconColor: "text-accent",
    desc: "Murs et sous-sol insuffisamment isolés représentent une perte majeure en hiver comme en été.",
  },
  {
    icon: Wind,
    title: "Ventilation",
    pct: "10–15 %",
    color: "from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
    desc: "Une ventilation déséquilibrée gaspille de l'énergie. Un échangeur d'air performant fait la différence.",
  },
];

/* ─── Grants / Programs ─── */
const grants = [
  {
    title: "Rénoclimat",
    amount: "Jusqu'à 20 000 $",
    desc: "Programme principal d'aide financière pour les rénovations écoénergétiques résidentielles au Québec.",
    tags: ["Isolation", "Fenêtres", "Ventilation"],
  },
  {
    title: "Chauffez vert",
    amount: "Jusqu'à 1 500 $",
    desc: "Aide pour le remplacement d'un système de chauffage au mazout par une thermopompe ou un système électrique.",
    tags: ["Chauffage", "Thermopompe"],
  },
  {
    title: "Subvention fédérale (SCHL)",
    amount: "Jusqu'à 40 000 $",
    desc: "Prêt sans intérêt du gouvernement fédéral pour les rénovations majeures visant l'efficacité énergétique.",
    tags: ["Rénovation majeure", "Fédéral"],
  },
];

/* ─── House SVG illustration ─── */
function HouseHeatDiagram() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      className="relative w-full max-w-xs mx-auto"
    >
      <svg viewBox="0 0 240 220" className="w-full" aria-label="Diagramme de pertes d'énergie d'une maison">
        {/* House body */}
        <rect x="50" y="100" width="140" height="100" rx="4" className="fill-muted/60 stroke-border" strokeWidth="1.5" />
        {/* Roof */}
        <polygon points="120,30 30,100 210,100" className="fill-muted/40 stroke-border" strokeWidth="1.5" />

        {/* Heat arrows – roof */}
        <motion.g
          animate={{ y: [-2, -8, -2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M100,50 L100,20" className="stroke-destructive/60" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrowRed)" />
          <path d="M120,40 L120,10" className="stroke-destructive/60" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrowRed)" />
          <path d="M140,50 L140,20" className="stroke-destructive/60" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrowRed)" />
        </motion.g>

        {/* Heat arrows – left wall */}
        <motion.g
          animate={{ x: [-2, -8, -2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <path d="M50,130 L20,130" className="stroke-warning/50" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrowOrange)" />
          <path d="M50,160 L20,160" className="stroke-warning/50" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrowOrange)" />
        </motion.g>

        {/* Heat arrows – right (windows) */}
        <motion.g
          animate={{ x: [2, 8, 2] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <path d="M190,130 L220,130" className="stroke-accent/50" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrowCyan)" />
          <path d="M190,160 L220,160" className="stroke-accent/50" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#arrowCyan)" />
        </motion.g>

        {/* Window */}
        <rect x="155" y="115" width="25" height="30" rx="2" className="fill-accent/10 stroke-accent/40" strokeWidth="1" />
        <line x1="167.5" y1="115" x2="167.5" y2="145" className="stroke-accent/30" strokeWidth="0.8" />
        <line x1="155" y1="130" x2="180" y2="130" className="stroke-accent/30" strokeWidth="0.8" />

        {/* Door */}
        <rect x="95" y="145" width="24" height="55" rx="2" className="fill-muted stroke-border" strokeWidth="1" />
        <circle cx="114" cy="175" r="2" className="fill-muted-foreground/30" />

        {/* Flame icon inside */}
        <motion.g
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <circle cx="80" cy="165" r="8" className="fill-destructive/15" />
          <text x="80" y="169" textAnchor="middle" className="fill-destructive text-[10px]">🔥</text>
        </motion.g>

        {/* Labels */}
        <text x="120" y="18" textAnchor="middle" className="fill-destructive text-[8px] font-semibold">25–30 %</text>
        <text x="14" y="148" textAnchor="middle" className="fill-warning text-[8px] font-semibold" transform="rotate(-90 14 148)">20–25 %</text>
        <text x="228" y="148" textAnchor="middle" className="fill-accent text-[8px] font-semibold" transform="rotate(90 228 148)">15–20 %</text>

        {/* Arrow markers */}
        <defs>
          <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" className="fill-destructive/60" />
          </marker>
          <marker id="arrowOrange" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" className="fill-warning/50" />
          </marker>
          <marker id="arrowCyan" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" className="fill-accent/50" />
          </marker>
        </defs>
      </svg>
    </motion.div>
  );
}

/* ─── Fade-up helper ─── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
};

/* ─── Page ─── */
export default function EnergyPage() {
  return (
    <MainLayout>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden py-20 px-5">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-5xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 text-caption font-semibold text-success mb-5">
                <Zap className="h-3 w-3" /> Efficacité énergétique
              </span>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-3">
                Réduisez vos pertes d'énergie.
              </h1>
              <p className="text-lg sm:text-xl text-foreground/80 leading-snug mb-6">
                Et <RotatingText />
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-8">
                Découvrez d'où s'échappe votre énergie, les programmes de subventions disponibles et les professionnels qualifiés pour améliorer votre maison.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/search">
                    Trouver un entrepreneur <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/homeowners">Calculer mon Score Maison</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.15 }}
            >
              <HouseHeatDiagram />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Energy Losses ─── */}
      <section className="py-16 px-5">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Où partent vos pertes d'énergie ?
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Chaque zone de votre maison contribue aux pertes thermiques. Identifiez les priorités pour réduire votre facture.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {energyLosses.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              >
                <Card className="group h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                        <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-display text-sm font-semibold text-foreground">{item.title}</h3>
                          <span className={`text-xs font-bold ${item.iconColor}`}>{item.pct}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Grants / Programs ─── */}
      <section className="py-16 px-5 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 text-caption font-semibold text-success mb-4">
              <DollarSign className="h-3 w-3" /> Subventions
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Programmes d'aide disponibles
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Hydro-Québec et les gouvernements offrent des milliers de dollars en subventions pour les rénovations écoénergétiques.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {grants.map((g, i) => (
              <motion.div
                key={g.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              >
                <Card className="h-full">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <BadgeCheck className="h-5 w-5 text-success shrink-0" />
                      <h3 className="font-display text-sm font-semibold text-foreground">{g.title}</h3>
                    </div>
                    <div className="rounded-lg bg-success/8 border border-success/15 px-3 py-2 mb-3">
                      <span className="font-display text-lg font-bold text-success">{g.amount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">{g.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Recommended Professionals ─── */}
      <section className="py-16 px-5">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-caption font-semibold text-primary mb-4">
              <Shield className="h-3 w-3" /> Professionnels vérifiés
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Trouvez les bons professionnels
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              UNPRO vous connecte avec des entrepreneurs qualifiés en isolation, fenêtres, ventilation et chauffage dans votre région.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Snowflake, label: "Isolation", desc: "Grenier, murs, sous-sol" },
              { icon: Sun, label: "Fenêtres & portes", desc: "Triple vitrage, Energy Star" },
              { icon: Flame, label: "Chauffage & ventilation", desc: "Thermopompes, VRC, VRE" },
            ].map((cat, i) => (
              <motion.div key={cat.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
                <Card className="group cursor-pointer">
                  <CardContent className="p-5 text-center">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/14 transition-colors">
                      <cat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-sm font-semibold text-foreground mb-1">{cat.label}</h3>
                    <p className="text-xs text-muted-foreground">{cat.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div {...fadeUp} className="rounded-2xl bg-gradient-to-br from-primary/8 via-secondary/5 to-accent/5 border border-primary/15 p-8 text-center">
            <Thermometer className="h-8 w-8 text-primary mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Prêt à améliorer l'efficacité de votre maison ?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Trouvez un entrepreneur certifié, profitez des subventions et commencez à économiser dès maintenant.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/search">
                  Trouver un entrepreneur <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/homeowners">Calculer mon Score Maison</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
