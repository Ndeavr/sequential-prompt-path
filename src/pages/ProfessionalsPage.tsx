/**
 * UNPRO — Contractor Landing Page (Premium, Conversion-focused)
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, CheckCircle2, Sparkles, MapPin,
  TrendingUp, Calendar, Shield, Brain,
  ChevronRight, Zap, Eye, Users, Gift, Send,
} from "lucide-react";
import { motion } from "framer-motion";
import ScoreRing from "@/components/ui/score-ring";
import MainLayout from "@/layouts/MainLayout";

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const HOW_IT_WORKS = [
  {
    icon: Brain,
    title: "Profil AIPP",
    desc: "Un profil intelligent, structuré pour être recommandé par Alex, notre IA concierge. Plus votre profil est complet, plus vous êtes visible.",
  },
  {
    icon: Sparkles,
    title: "Recommandation IA",
    desc: "Quand un propriétaire décrit un problème, Alex analyse le contexte et recommande les entrepreneurs les plus pertinents.",
  },
  {
    icon: Calendar,
    title: "Système de rendez-vous",
    desc: "Les propriétaires réservent directement. Vous recevez des rendez-vous qualifiés, pas des demandes de soumission.",
  },
];

const AIPP_BENEFITS = [
  { icon: Eye, label: "Visibilité dans les résultats de recherche", desc: "Plus votre score est élevé, plus vous apparaissez en haut." },
  { icon: TrendingUp, label: "Position dans les recommandations Alex", desc: "Alex priorise les profils avec un AIPP élevé." },
  { icon: Shield, label: "Crédibilité auprès des propriétaires", desc: "Un badge vérifié et un score fort inspirent confiance." },
];

const FOUNDER_BENEFITS = [
  "Profil AIPP complet",
  "Recommandation Alex activée",
  "Territoire réservé selon disponibilité",
  "Badge Fondateur",
  "Analyse privée de votre marché",
];

const TERRITORIES = [
  { category: "Isolation", city: "Laval", used: 2, total: 5 },
  { category: "Toiture", city: "Montréal", used: 7, total: 10 },
  { category: "Drainage", city: "Longueuil", used: 2, total: 5 },
  { category: "Plomberie", city: "Québec", used: 1, total: 5 },
];

const REFERRAL_STEPS = [
  { icon: Send, label: "Envoyez votre lien à 2 entrepreneurs sérieux" },
  { icon: Users, label: "Ils créent leur profil AIPP sur UNPRO" },
  { icon: Gift, label: "Vous recevez un boost de visibilité immédiat" },
];

export default function ProfessionalsPage() {
  return (
    <MainLayout>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Radial ray burst background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--secondary) / 0.08) 0%, transparent 70%),
            radial-gradient(ellipse 60% 80% at 30% 60%, hsl(var(--primary) / 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 70% 30%, hsl(var(--accent) / 0.05) 0%, transparent 50%)
          `
        }} />
        {/* Animated ray lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 origin-left"
              style={{
                width: "120%",
                height: "1px",
                rotate: `${i * 15}deg`,
                background: `linear-gradient(90deg, transparent 0%, hsl(var(--secondary) / ${0.04 + (i % 3) * 0.02}) 30%, hsl(var(--primary) / ${0.03 + (i % 2) * 0.02}) 60%, transparent 100%)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </div>
        {/* Soft glowing orbs */}
        <div className="absolute top-[10%] left-[10%] w-[35vw] h-[35vw] rounded-full blur-[120px] pointer-events-none" style={{ background: "hsl(var(--secondary) / 0.1)" }} />
        <div className="absolute bottom-[5%] right-[5%] w-[30vw] h-[30vw] rounded-full blur-[100px] pointer-events-none" style={{ background: "hsl(var(--primary) / 0.08)" }} />
        <div className="absolute top-[30%] right-[20%] w-[20vw] h-[20vw] rounded-full blur-[80px] pointer-events-none" style={{ background: "hsl(var(--accent) / 0.06)" }} />

        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-20 pb-14 md:pt-32 md:pb-20">
          <motion.div className="space-y-6 max-w-xl" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 bg-success/10 text-success border-success/20">
                <Zap className="h-3 w-3" />
                Places Founder restantes — 49 / 50
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="font-display text-3xl md:text-[3rem] leading-[1.08] font-extrabold tracking-tight text-foreground">
              Moins de soumissions inutiles.{" "}
              <span className="bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent">
                Plus de vrais rendez-vous.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
              UNPRO connecte les propriétaires aux bons entrepreneurs, au bon moment. Fini les appels à froid et les soumissions sans retour.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="xl" className="w-full sm:w-auto rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow">
                <Link to="/aipp-score">Voir mon Score AIPP <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto rounded-2xl">
                <Link to="/contractor-onboarding">Rejoindre UNPRO <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Comment ça fonctionne ── */}
      <section className="px-5 py-16">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/20 px-3 py-1 text-caption font-semibold text-secondary mb-4">
              <Brain className="h-3 w-3" /> Comment ça fonctionne
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground">Des rendez-vous qualifiés, pas des soumissions.</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i}>
                <Card className="h-full text-center">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-secondary/15 to-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Score AIPP ── */}
      <section className="px-5 py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-caption font-semibold text-primary mb-4">
                <TrendingUp className="h-3 w-3" /> Score AIPP
              </span>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">Votre Score AIPP détermine tout.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Le score AIPP (AI-Indexed Professional Profile) mesure la qualité, la crédibilité et la visibilité de votre profil. Plus il est élevé, plus vous recevez de rendez-vous.
              </p>
              <div className="space-y-3">
                {AIPP_BENEFITS.map((b) => (
                  <div key={b.label} className="flex items-start gap-3 rounded-xl bg-card/60 border border-border/40 p-3.5">
                    <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
                      <b.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-0.5">{b.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Actuel</p>
                      <ScoreRing score={61} size={90} label="Score" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="h-5 w-5 text-secondary" />
                      <span className="text-[10px] text-secondary font-semibold">Potentiel</span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Possible</p>
                      <ScoreRing score={82} size={90} label="Score" colorClass="text-success" />
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/30 text-center">
                    <Button asChild variant="soft" size="sm">
                      <Link to="/aipp-score">Calculer mon score <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Accès Founder privé ── */}
      <section className="px-5 py-16">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/20 px-3 py-1 text-caption font-semibold text-warning mb-4">
              <Sparkles className="h-3 w-3" /> Accès Founder privé
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Accès exclusif, sur approbation.</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl bg-success/8 border border-success/15 px-4 py-3 text-center mb-10 max-w-md mx-auto"
          >
              <p className="text-xs text-success font-semibold">
               💡 Les conditions Founder sont partagées uniquement après validation du territoire.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto">
            <Card className="border-secondary/30 shadow-glow relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-secondary via-primary to-accent" />
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 mb-6">
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">Programme Founder UNPRO</h3>
                    <Badge className="mt-2 bg-secondary/12 text-secondary border-secondary/20 text-[10px]">Invitation privée</Badge>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm font-semibold text-foreground">Territoires limités · validation manuelle</p>
                    <p className="text-[10px] text-muted-foreground">Conditions partagées après qualification</p>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {FOUNDER_BENEFITS.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                <Button asChild className="w-full rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow" size="lg">
                  <Link to="/contact?subject=founder">Postuler en privé <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── Territoires ── */}
      <section className="px-5 py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-caption font-semibold text-primary mb-4">
              <MapPin className="h-3 w-3" /> Territoires
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Places limitées par territoire.</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Chaque catégorie dans chaque ville a un nombre maximum d'entrepreneurs. Réservez avant que votre territoire soit complet.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {TERRITORIES.map((t, i) => {
              const remaining = t.total - t.used;
              const pct = (t.used / t.total) * 100;
              const almostFull = pct >= 60;
              return (
                <motion.div key={t.category + t.city} variants={fadeUp} custom={i}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div>
                            <span className="text-sm font-bold text-foreground">{t.category}</span>
                            <span className="text-xs text-muted-foreground ml-1.5">{t.city}</span>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${almostFull ? "bg-warning/12 text-warning border-warning/20" : "bg-success/12 text-success border-success/20"}`}>
                          {remaining} places restantes
                        </Badge>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${almostFull ? "bg-warning" : "bg-success"}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">{t.used} / {t.total} places occupées</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Referral Section ── */}
      <section className="px-5 py-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-gradient-to-br from-secondary/8 via-primary/5 to-accent/5 border border-secondary/15 overflow-hidden"
          >
            <div className="p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/12 border border-secondary/20 px-3 py-1 text-caption font-semibold text-secondary mb-4">
                    <Gift className="h-3 w-3" /> Programme de référence
                  </span>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                    Vous voulez des rendez-vous la semaine prochaine ?
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Référez <span className="font-bold text-foreground">2 entrepreneurs sérieux</span> et recevez un boost de visibilité immédiat dans votre territoire. Plus vous référez, plus vous montez.
                  </p>

                  <div className="space-y-3 mb-6">
                    {REFERRAL_STEPS.map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="shrink-0 h-8 w-8 rounded-lg bg-secondary/12 flex items-center justify-center">
                          <step.icon className="h-4 w-4 text-secondary" />
                        </div>
                        <span className="text-xs text-foreground/80 font-medium">{step.label}</span>
                      </div>
                    ))}
                  </div>

                  <Button asChild size="lg" className="rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow">
                    <Link to="/contractor-onboarding">Obtenir mon lien de référence <ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                </div>

                {/* Referral visual */}
                <div className="hidden md:block">
                  <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-6 space-y-4">
                    <div className="text-center mb-2">
                      <p className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Votre impact</p>
                      <p className="font-display text-4xl font-extrabold text-secondary">2</p>
                      <p className="text-[11px] text-muted-foreground">références nécessaires</p>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: "Boost visibilité", value: "+25 %", color: "text-success" },
                        { label: "Priorité Alex", value: "+1 niveau", color: "text-primary" },
                        { label: "Score AIPP", value: "+5 pts", color: "text-secondary" },
                      ].map((r) => (
                        <div key={r.label} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                          <span className="text-xs text-muted-foreground">{r.label}</span>
                          <span className={`text-xs font-bold ${r.color}`}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="px-5 py-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-gradient-to-br from-primary/8 via-secondary/5 to-accent/5 border border-primary/15 p-8 text-center"
          >
            <Sparkles className="h-8 w-8 text-secondary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-3">
              Réservez votre position dans le réseau UNPRO
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Rejoignez les premiers entrepreneurs à bénéficier de l'IA pour recevoir des rendez-vous qualifiés, sans soumissions inutiles.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow">
                <Link to="/contractor-onboarding">Créer mon profil <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl">
                <Link to="/aipp-score">Voir mon Score AIPP</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
