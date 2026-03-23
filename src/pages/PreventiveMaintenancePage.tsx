/**
 * UNPRO — Preventive Maintenance Landing Page
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  ArrowRight,
  Droplets,
  CloudRain,
  Thermometer,
  AlertTriangle,
  Activity,
  Eye,
  Brain,
  Sparkles,
  TrendingUp,
  Home,
  ChevronRight,
  MessageCircle,
} from "lucide-react";

/* ─── Rotating hero titles ─── */
const rotatingTitles = [
  "détectez les problèmes tôt",
  "évitez les réparations majeures",
  "protégez votre maison",
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
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -28, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="block text-primary"
        >
          {rotatingTitles[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ─── Health dashboard SVG illustration ─── */
function HealthDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7 }}
      className="relative w-full max-w-sm mx-auto"
    >
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Activity className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="font-display text-xs font-semibold text-foreground">Santé de la maison</span>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="ml-auto flex items-center gap-1 text-success text-[10px] font-semibold"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Surveillance active
          </motion.span>
        </div>

        {/* Score */}
        <div className="px-4 py-4 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" className="stroke-muted" strokeWidth="5" />
              <motion.circle
                cx="32" cy="32" r="28"
                fill="none"
                className="stroke-primary"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 28}
                initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - 0.72) }}
                transition={{ duration: 1.2, delay: 0.3 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-foreground">72</span>
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-foreground">Score Maison</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">3 alertes détectées</p>
          </div>
        </div>

        {/* Alert items */}
        <div className="px-4 pb-4 space-y-2">
          {[
            { label: "Humidité sous-sol", severity: "high", icon: Droplets },
            { label: "Usure toiture", severity: "medium", icon: CloudRain },
            { label: "Condensation grenier", severity: "low", icon: Thermometer },
          ].map((alert, i) => (
            <motion.div
              key={alert.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.6 + i * 0.15 }}
              className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2"
            >
              <alert.icon className={`h-3.5 w-3.5 shrink-0 ${
                alert.severity === "high" ? "text-destructive" :
                alert.severity === "medium" ? "text-warning" : "text-accent"
              }`} />
              <span className="text-[11px] text-foreground font-medium flex-1">{alert.label}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                alert.severity === "high" ? "bg-destructive/10 text-destructive" :
                alert.severity === "medium" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"
              }`}>
                {alert.severity === "high" ? "Urgent" : alert.severity === "medium" ? "Moyen" : "Faible"}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Fade-up preset ─── */
const ease: [number, number, number, number] = [0.4, 0, 0.2, 1];
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
  transition: { duration: 0.5, ease },
};

/* ─── Hidden problems data ─── */
const hiddenProblems = [
  {
    icon: Droplets,
    title: "Sous-sol humide",
    desc: "L'humidité chronique peut endommager les fondations, favoriser la moisissure et dégrader la qualité de l'air intérieur.",
    cost: "5 000 – 15 000 $",
    prevention: "Inspection annuelle + drain français",
    color: "text-accent",
    bg: "from-accent/15 to-accent/5",
  },
  {
    icon: Thermometer,
    title: "Condensation au grenier",
    desc: "Un manque de ventilation ou d'isolation cause de la condensation qui mène à la pourriture du bois et aux infiltrations.",
    cost: "3 000 – 10 000 $",
    prevention: "Ventilation adéquate + pare-vapeur",
    color: "text-secondary",
    bg: "from-secondary/15 to-secondary/5",
  },
  {
    icon: CloudRain,
    title: "Usure de la toiture",
    desc: "Les bardeaux perdent leur efficacité avec le temps. Une fuite non détectée peut causer des dommages structurels majeurs.",
    cost: "8 000 – 25 000 $",
    prevention: "Inspection tous les 5 ans",
    color: "text-destructive",
    bg: "from-destructive/15 to-destructive/5",
  },
  {
    icon: AlertTriangle,
    title: "Problèmes de drainage",
    desc: "Un mauvais drainage autour des fondations cause des infiltrations d'eau et peut compromettre la stabilité de la structure.",
    cost: "4 000 – 12 000 $",
    prevention: "Pente correcte + gouttières entretenues",
    color: "text-warning",
    bg: "from-warning/15 to-warning/5",
  },
];

/* ─── Alex conversation simulation ─── */
const alexMessages = [
  { role: "alex" as const, text: "Bonjour ! J'ai analysé votre Score Maison. Trois zones méritent votre attention." },
  { role: "alex" as const, text: "Votre toiture a 22 ans. Statistiquement, les bardeaux d'asphalte commencent à se dégrader après 20 ans au Québec." },
  { role: "user" as const, text: "C'est urgent ?" },
  { role: "alex" as const, text: "Pas immédiatement, mais une inspection préventive maintenant pourrait vous éviter une réparation de 15 000 $ dans 2-3 ans. Je peux vous mettre en contact avec un couvreur vérifié." },
];

function AlexConversation() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < alexMessages.length) {
      const delay = visibleCount === 0 ? 600 : 1200;
      const t = setTimeout(() => setVisibleCount((c) => c + 1), delay);
      return () => clearTimeout(t);
    }
  }, [visibleCount]);

  return (
    <div className="space-y-3 max-w-md">
      <AnimatePresence>
        {alexMessages.slice(0, visibleCount).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/70 text-foreground border border-border/40 rounded-bl-md"
            }`}>
              {msg.role === "alex" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">Alex</span>
                </div>
              )}
              <p className="text-xs leading-relaxed">{msg.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {visibleCount < alexMessages.length && (
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="flex items-center gap-1.5 px-3"
        >
          <Sparkles className="h-3 w-3 text-primary" />
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function PreventiveMaintenancePage() {
  return (
    <MainLayout>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden py-20 px-5">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/4 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-5xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-caption font-semibold text-primary mb-5">
                <Shield className="h-3 w-3" /> Entretien préventif
              </span>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-3">
                Les meilleures économies sont celles qu'on évite.
              </h1>
              <p className="text-lg sm:text-xl text-foreground/80 leading-snug mb-6">
                Et <RotatingText />
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-8">
                UNPRO surveille la santé de votre maison et vous alerte avant que les petits problèmes deviennent de grandes dépenses.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/homeowners">
                    Découvrir le Score Maison <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
              <HealthDashboard />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Hidden Problems ─── */}
      <section className="py-16 px-5">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Problèmes cachés fréquents
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Ces problèmes se développent silencieusement pendant des années. Le coût de réparation est toujours plus élevé quand ils sont découverts trop tard.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {hiddenProblems.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              >
                <Card className="group h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br ${item.bg} flex items-center justify-center`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-destructive bg-destructive/8 rounded-md px-2 py-0.5">
                              Coût si ignoré : {item.cost}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3 text-success shrink-0" />
                            <span className="text-[10px] text-success font-medium">{item.prevention}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Score Maison Monitoring ─── */}
      <section className="py-16 px-5 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1 text-caption font-semibold text-success mb-4">
                <Activity className="h-3 w-3" /> Surveillance continue
              </span>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                Votre Score Maison évolue avec le temps
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Chaque inspection, chaque travail complété et chaque document ajouté met à jour votre score. UNPRO détecte automatiquement les zones à risque en fonction de l'âge, du type et de la condition de votre propriété.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Eye, label: "Détection proactive", desc: "Alertes basées sur l'âge des composants et l'historique de votre maison." },
                  { icon: TrendingUp, label: "Suivi dans le temps", desc: "Voyez l'évolution de chaque catégorie au fil des mois et des années." },
                  { icon: Home, label: "Passeport Maison", desc: "Tous vos documents, inspections et travaux centralisés en un seul endroit." },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.label}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.1 + i * 0.08 }}
                    className="flex items-start gap-3 rounded-xl bg-card/60 border border-border/40 p-3.5"
                  >
                    <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-0.5">{feature.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Score evolution visual */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
              <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-xs font-semibold text-foreground">Évolution du score</span>
                  <span className="text-[10px] text-muted-foreground">12 derniers mois</span>
                </div>
                {/* Simplified sparkline chart */}
                <svg viewBox="0 0 300 100" className="w-full h-20" aria-label="Évolution du score sur 12 mois">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.2" />
                      <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M0,70 L25,68 L50,65 L75,63 L100,58 L125,55 L150,50 L175,45 L200,42 L225,38 L250,33 L275,28 L300,25"
                    fill="none"
                    className="stroke-primary"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                  />
                  <path
                    d="M0,70 L25,68 L50,65 L75,63 L100,58 L125,55 L150,50 L175,45 L200,42 L225,38 L250,33 L275,28 L300,25 L300,100 L0,100 Z"
                    fill="url(#chartGrad)"
                  />
                </svg>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Il y a 12 mois</p>
                    <p className="font-display text-sm font-bold text-muted-foreground">62</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-[10px] font-bold text-success">+10 pts</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
                    <p className="font-display text-sm font-bold text-foreground">72</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Alex AI Section ─── */}
      <section className="py-16 px-5">
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Conversation */}
            <motion.div {...fadeUp} className="order-2 md:order-1">
              <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="font-display text-xs font-semibold text-foreground">Alex · Assistant IA</span>
                </div>
                <AlexConversation />
              </div>
            </motion.div>

            {/* Copy */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="order-1 md:order-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/20 px-3 py-1 text-caption font-semibold text-secondary mb-4">
                <Brain className="h-3 w-3" /> Intelligence artificielle
              </span>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                Alex vous explique les risques
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Alex analyse les données de votre maison et vous explique clairement les risques, les priorités et les prochaines étapes — sans jargon technique.
              </p>
              <div className="space-y-2">
                {[
                  "Interprète votre Score Maison en langage clair",
                  "Identifie les risques selon l'âge et le type de propriété",
                  "Recommande des professionnels vérifiés dans votre région",
                  "Vous guide étape par étape vers les bonnes décisions",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <MessageCircle className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
                    <span className="text-xs text-foreground/80 leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button variant="soft" size="sm" onClick={() => alexVoice.openAlex("general")}>
                  Parler à Alex <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-16 px-5">
        <div className="mx-auto max-w-5xl">
          <motion.div
            {...fadeUp}
            className="rounded-2xl bg-gradient-to-br from-primary/8 via-secondary/5 to-success/5 border border-primary/15 p-8 text-center"
          >
            <Shield className="h-8 w-8 text-primary mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Mieux vaut prévenir que réparer
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Calculez votre Score Maison gratuitement et découvrez les zones à surveiller avant qu'elles ne deviennent des problèmes coûteux.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/homeowners">
                  Découvrir le Score Maison <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/search">Trouver un professionnel</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
