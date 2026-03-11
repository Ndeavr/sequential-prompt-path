/**
 * UNPRO — Contractor Landing Page (Conversion-focused)
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, CheckCircle2, Sparkles, MapPin,
  TrendingUp, Users, Calendar, Shield, Brain,
  ChevronRight, Clock, Star, Zap, Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import ScoreRing from "@/components/ui/score-ring";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const HOW_IT_WORKS = [
  {
    icon: Brain,
    title: "Profil AIPP",
    desc: "Profil structuré pour être recommandé par Alex, notre IA concierge.",
  },
  {
    icon: Sparkles,
    title: "Recommandation intelligente",
    desc: "Quand un propriétaire décrit un problème, Alex recommande les entrepreneurs pertinents.",
  },
  {
    icon: Calendar,
    title: "Réservation simple",
    desc: "Agenda connecté ou préférence : matin, après-midi, fin de journée.",
  },
];

const AIPP_BENEFITS = [
  { icon: Eye, label: "Votre visibilité" },
  { icon: TrendingUp, label: "Votre position" },
  { icon: Sparkles, label: "Vos recommandations Alex" },
];

const PLANS = [
  {
    name: "Founder Early",
    price: "1 997$",
    tag: "Accès à vie",
    features: [
      "Profil AIPP complet",
      "Recommandation Alex",
      "1 territoire inclus",
      "Accès fondateur permanent",
      "Aucun frais mensuel",
    ],
  },
  {
    name: "Founder Prime",
    price: "2 997$",
    tag: "Priorité Alex",
    highlight: true,
    features: [
      "Tout de Founder Early",
      "Priorité maximale Alex",
      "3 territoires inclus",
      "Badge Fondateur Prime",
      "Support prioritaire dédié",
    ],
  },
];

const TERRITORIES = [
  { category: "Isolation", city: "Laval", used: 3, total: 5 },
  { category: "Toiture", city: "Montréal", used: 6, total: 10 },
  { category: "Drainage", city: "Longueuil", used: 2, total: 5 },
];

export default function ProfessionalsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-[5%] left-[-15%] w-[50vw] h-[50vw] rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[5%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/8 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-28 pb-16 md:pt-40 md:pb-24">
          <motion.div className="space-y-6 max-w-xl" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 bg-success/10 text-success border-success/20">
                <Zap className="h-3 w-3" />
                Places Founder restantes — 49 / 50
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="text-[1.75rem] md:text-[3rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-foreground">
              Moins de soumissions inutiles.{" "}
              <span className="text-gradient">Plus de vrais rendez-vous.</span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
              UNPRO connecte les propriétaires aux bons entrepreneurs, au bon moment.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto h-14 text-base rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-[0_0_32px_-4px_hsl(252,100%,65%,0.4)]">
                <Link to="/aipp-score">Voir mon Score AIPP <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 text-base rounded-2xl border-border/50 hover:bg-muted/30">
                <Link to="/contractor-onboarding">Réserver ma position <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Comment ça fonctionne ── */}
      <section className="px-5 py-14 relative">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
            <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-2">Comment ça fonctionne</p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Des rendez-vous qualifiés, pas des soumissions.</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i}>
                <div className="glass-card-elevated rounded-2xl p-6 h-full text-center">
                  <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Score AIPP ── */}
      <section className="px-5 py-14 relative">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-2">Score AIPP</p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Votre Score AIPP détermine tout.</h2>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card-elevated rounded-3xl p-6 md:p-8">
            {/* Benefits list */}
            <div className="space-y-3 mb-8">
              {AIPP_BENEFITS.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{b.label}</span>
                </div>
              ))}
            </div>

            <div className="divider-gradient mb-6" />

            {/* Score comparison */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Actuel</p>
                <ScoreRing score={61} size={80} label="Score" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="h-5 w-5 text-secondary" />
                <span className="text-[10px] text-secondary font-semibold">Potentiel</span>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Possible</p>
                <ScoreRing score={82} size={80} label="Score" colorClass="text-success" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Offres Founder ── */}
      <section className="px-5 py-14">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
            <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-2">Offres Founder</p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Accès exclusif, places limitées.</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Vous ne payez que si vous voulez augmenter le nombre de rendez-vous.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANS.map((p, i) => (
              <motion.div key={p.name} variants={fadeUp} custom={i}>
                <div className={`rounded-3xl p-6 h-full ${p.highlight ? "pricing-highlight bg-gradient-to-br from-secondary/8 to-primary/4 shadow-glow" : "glass-card-elevated"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">{p.name}</h3>
                      <Badge className="mt-1 bg-secondary/15 text-secondary border-secondary/20 text-[10px]">{p.tag}</Badge>
                    </div>
                    <p className="text-2xl font-extrabold text-foreground">{p.price}</p>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className={`w-full rounded-2xl h-12 ${p.highlight ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-[0_0_24px_-4px_hsl(252,100%,65%,0.3)]" : ""}`} variant={p.highlight ? "default" : "outline"}>
                    <Link to="/contractor-onboarding">Réserver ma place <ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Territoires ── */}
      <section className="px-5 py-14 relative">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-2">Territoires</p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Places limitées par territoire.</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {TERRITORIES.map((t, i) => {
              const pct = (t.used / t.total) * 100;
              const almostFull = pct >= 60;
              return (
                <motion.div key={t.category + t.city} variants={fadeUp} custom={i}>
                  <div className="glass-card-elevated rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        <div>
                          <span className="text-sm font-bold text-foreground">{t.category}</span>
                          <span className="text-xs text-muted-foreground ml-2">{t.city}</span>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${almostFull ? "bg-warning/15 text-warning border-warning/20" : "bg-success/15 text-success border-success/20"}`}>
                        {t.total - t.used} places restantes
                      </Badge>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${almostFull ? "bg-warning" : "bg-success"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">{t.used} / {t.total} places occupées</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="px-5 py-16 relative">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-lg mx-auto text-center space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Sparkles className="h-8 w-8 text-secondary mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
              Réservez votre position dans le réseau UNPRO
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Rejoignez les premiers entrepreneurs à bénéficier de l'IA pour recevoir des rendez-vous qualifiés.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="w-full sm:w-auto h-14 text-base rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-[0_0_32px_-4px_hsl(252,100%,65%,0.4)]">
                <Link to="/contractor-onboarding">Créer mon profil <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 text-base rounded-2xl border-border/50 hover:bg-muted/30">
                <Link to="/aipp-score">Voir mon Score AIPP</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
