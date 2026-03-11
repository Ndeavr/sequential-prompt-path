import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Search, Home as HomeIcon, Shield, TrendingUp,
  Sparkles, ArrowRight, Star, Brain,
  MessageCircle, Heart, HardHat,
  FileText, Trophy, CheckCircle2, ChevronRight,
  Upload, BarChart3, Zap, ShieldCheck, Eye, Camera, Layers,
  Clock, MapPin, Award, ThumbsUp, Users, FolderOpen,
} from "lucide-react";
import { motion } from "framer-motion";

/* ── Animation presets ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const sectionFade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const Home = () => {
  const { isAuthenticated, role } = useAuth();
  const dash = role === "contractor" ? "/pro" : role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex flex-col bg-background">

      {/* ═══════════════════════════════════════════════════════════
          HERO — Cinematic, full-screen, product-led
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[100dvh] flex flex-col">
        {/* Ambient light */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-primary/8 blur-[140px]" />
          <div className="absolute bottom-[0%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-secondary/6 blur-[120px]" />
          <div className="absolute top-[30%] right-[5%] w-[25vw] h-[25vw] rounded-full bg-accent/4 blur-[90px]" />
        </div>

        {/* Dot grid texture */}
        <div className="absolute inset-0 dot-grid opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 flex-1 flex flex-col justify-center px-5 pt-20 pb-8">
          <motion.div className="max-w-2xl mx-auto w-full" initial="hidden" animate="visible">

            {/* Eyebrow badge */}
            <motion.div variants={fadeUp} custom={0} className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/6 border border-primary/12 px-3.5 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-caption font-semibold text-primary tracking-wide">Plateforme IA pour l'habitation</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp} custom={1}
              className="font-display text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] leading-[1.05] font-bold tracking-[-0.04em] text-foreground max-w-xl"
            >
              Trouvez le bon entrepreneur.{" "}
              <span className="text-gradient">Comprenez votre projet.</span>{" "}
              Décidez mieux.
            </motion.h1>

            {/* Subheadline */}
            <motion.p variants={fadeUp} custom={2} className="text-body-lg text-muted-foreground leading-relaxed max-w-md mt-5">
              Utilisez l'IA pour analyser vos soumissions, comparer les entrepreneurs et gérer votre propriété en toute confiance.
            </motion.p>

            {/* CTA group */}
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button asChild size="xl" className="rounded-xl shadow-glow">
                <Link to={isAuthenticated ? "/describe-project" : "/signup"}>
                  Décrire mon projet
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="rounded-xl">
                <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                  Comparer 3 soumissions
                </Link>
              </Button>
            </motion.div>

            {/* Social proof strip */}
            <motion.div variants={fadeUp} custom={4} className="flex items-center gap-5 mt-8">
              <div className="flex -space-x-2.5">
                {["MC", "JF", "ST", "PL", "AB"].map((initials, i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                    {initials}
                  </div>
                ))}
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 fill-current text-amber-400" />)}
                  <span className="text-meta font-bold ml-1 text-foreground">4.9</span>
                </div>
                <p className="text-caption text-muted-foreground">+10 000 projets analysés</p>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Floating product cards (hero visual) ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto w-full mt-10"
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Project card */}
              <div className="glass-card-elevated rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-caption font-semibold text-foreground">Mon projet</span>
                </div>
                <p className="text-caption text-muted-foreground leading-relaxed">Rénovation cuisine complète · Budget 25-35k$</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary w-[65%]" /></div>
                  <span className="text-[10px] font-semibold text-primary shrink-0">65%</span>
                </div>
              </div>

              {/* Score card */}
              <div className="glass-card-elevated rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center">
                    <Heart className="h-3.5 w-3.5 text-success" />
                  </div>
                  <span className="text-caption font-semibold text-foreground">Score Maison</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-title font-bold text-foreground">82</span>
                  <span className="text-caption text-muted-foreground">/100</span>
                </div>
                <p className="text-[10px] text-success font-medium">Bon état général</p>
              </div>

              {/* Quote comparison card — spans 2 cols */}
              <div className="col-span-2 glass-card-elevated rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <BarChart3 className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <span className="text-caption font-semibold text-foreground">Comparaison IA</span>
                  <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/8 border border-success/15">
                    <CheckCircle2 className="h-2.5 w-2.5 text-success" />
                    <span className="text-[10px] font-semibold text-success">Recommandée</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Soum. A", price: "8 500$", score: 72, best: false },
                    { label: "Soum. B", price: "7 200$", score: 91, best: true },
                    { label: "Soum. C", price: "9 800$", score: 65, best: false },
                  ].map(q => (
                    <div key={q.label} className={`rounded-lg p-2.5 text-center ${q.best ? "bg-success/6 border border-success/15" : "bg-muted/20 border border-transparent"}`}>
                      <p className="text-[10px] text-muted-foreground">{q.label}</p>
                      <p className="font-display text-meta font-bold text-foreground mt-0.5">{q.price}</p>
                      <p className={`font-display text-body font-bold mt-1 ${q.best ? "text-success" : q.score < 70 ? "text-destructive" : "text-muted-foreground"}`}>{q.score}<span className="text-caption font-normal opacity-50">/100</span></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Alex AI orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-28 right-5 md:bottom-24 md:right-10 z-20"
        >
          <Link to="/alex" className="group">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow alex-orb group-hover:shadow-glow-lg transition-shadow duration-500">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-success border-2 border-background animate-pulse" />
              {/* Tooltip */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap hidden md:block opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="glass-card rounded-lg px-3 py-2 text-caption font-medium text-foreground shadow-elevation">
                  Besoin d'aide pour décrire votre projet?
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          PRIMARY ACTION CARDS — 4 premium staggered cards
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative px-5 py-20 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Actions rapides</p>
            <h2 className="font-display text-title text-foreground">Que souhaitez-vous faire?</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: FileText, title: "Décrire mon projet", desc: "Décrivez vos travaux et recevez une analyse IA personnalisée.", to: isAuthenticated ? "/describe-project" : "/signup", accent: "primary" },
              { icon: BarChart3, title: "Comparer 3 soumissions", desc: "Téléchargez vos devis et laissez l'IA les analyser côte à côte.", to: isAuthenticated ? "/dashboard/quotes/upload" : "/signup", accent: "secondary" },
              { icon: Heart, title: "Score Maison", desc: "Évaluez l'état de votre propriété avec un score détaillé.", to: isAuthenticated ? "/dashboard/home-score" : "/signup", accent: "success" },
              { icon: Search, title: "Trouver un pro", desc: "Parcourez notre réseau d'entrepreneurs vérifiés et certifiés.", to: "/search", accent: "accent" },
            ].map((card, i) => (
              <motion.div key={card.title} variants={fadeUp} custom={i}>
                <Link to={card.to} className="block h-full">
                  <div className="glass-card-elevated rounded-2xl p-6 h-full group relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-40 h-40 rounded-full bg-${card.accent}/6 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
                    <div className="relative">
                      <div className={`h-11 w-11 rounded-xl bg-${card.accent}/8 border border-${card.accent}/12 flex items-center justify-center mb-4`}>
                        <card.icon className={`h-5 w-5 text-${card.accent}`} />
                      </div>
                      <h3 className="font-display text-body font-semibold text-foreground mb-1.5">{card.title}</h3>
                      <p className="text-meta text-muted-foreground leading-relaxed">{card.desc}</p>
                      <div className="mt-4 flex items-center gap-1.5 text-meta font-semibold text-primary opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                        Commencer <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TRUST STRIP
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: ShieldCheck, label: "Entrepreneurs vérifiés", value: "100%" },
                { icon: Brain, label: "Analyse IA", value: "30 sec" },
                { icon: Users, label: "Propriétaires aidés", value: "10K+" },
                { icon: Award, label: "Professionnels certifiés", value: "500+" },
              ].map((item) => (
                <div key={item.label} className="text-center space-y-2 p-4 rounded-xl border border-border/20 bg-card/30">
                  <item.icon className="h-5 w-5 text-primary mx-auto" />
                  <p className="font-display text-body font-bold text-foreground">{item.value}</p>
                  <p className="text-caption text-muted-foreground leading-tight">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS — 4 elegant steps
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative px-5 py-20 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Comment ça marche</p>
            <h2 className="font-display text-title text-foreground">Quatre étapes vers le bon entrepreneur</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 gap-4">
            {[
              { step: "01", icon: FileText, title: "Décrivez votre projet", desc: "Expliquez vos besoins en quelques phrases. Notre IA comprend le contexte." },
              { step: "02", icon: Upload, title: "Téléchargez vos documents", desc: "Photos, soumissions, plans — notre système extrait les données automatiquement." },
              { step: "03", icon: Brain, title: "Recevez l'analyse IA", desc: "Comparaison de prix, détection d'anomalies, recommandations personnalisées." },
              { step: "04", icon: Trophy, title: "Rencontrez le bon pro", desc: "Choisissez en confiance parmi des entrepreneurs vérifiés et recommandés." },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i}>
                <div className="glass-card-elevated rounded-2xl p-6 h-full relative overflow-hidden">
                  <span className="absolute top-4 right-5 font-display text-[3rem] font-bold text-muted/30 leading-none select-none">{item.step}</span>
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h3 className="font-display text-body font-semibold text-foreground mb-1.5">{item.title}</h3>
                    <p className="text-meta text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          QUOTE COMPARISON PREVIEW — Flagship feature
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Analyse IA des soumissions</p>
            <h2 className="font-display text-title text-foreground">Comparez 3 soumissions en 30 secondes</h2>
            <p className="text-body text-muted-foreground mt-3 max-w-md mx-auto">Notre intelligence artificielle analyse prix, matériaux, couverture et clauses contractuelles pour chaque soumission.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="glass-card-elevated rounded-2xl p-6 md:p-8 space-y-5 border-glow">
              {/* Quote cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "Soumission A", contractor: "Réno Expert", price: "8 500$", materials: "Standard", timeline: "3 semaines", score: 72, best: false },
                  { name: "Soumission B", contractor: "Pro Habitat", price: "7 200$", materials: "Haut de gamme", timeline: "2 semaines", score: 91, best: true },
                  { name: "Soumission C", contractor: "QC Rénov", price: "9 800$", materials: "Standard", timeline: "4 semaines", score: 65, best: false },
                ].map(q => (
                  <div key={q.name} className={`rounded-xl p-4 transition-all duration-300 ${q.best ? "bg-success/5 border border-success/20 shadow-soft" : "bg-muted/15 border border-border/20"}`}>
                    {q.best && (
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span className="text-[10px] font-bold text-success uppercase tracking-wider">Recommandée</span>
                      </div>
                    )}
                    <p className="text-caption font-medium text-muted-foreground">{q.name}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{q.contractor}</p>
                    <p className="font-display text-section font-bold text-foreground mt-2">{q.price}</p>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-caption">
                        <span className="text-muted-foreground">Matériaux</span>
                        <span className="font-medium text-foreground">{q.materials}</span>
                      </div>
                      <div className="flex justify-between text-caption">
                        <span className="text-muted-foreground">Délai</span>
                        <span className="font-medium text-foreground">{q.timeline}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/20 text-center">
                      <p className={`font-display text-title font-bold ${q.best ? "text-success" : q.score < 70 ? "text-destructive" : "text-muted-foreground"}`}>{q.score}</p>
                      <p className="text-[10px] text-muted-foreground/50">/100</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI recommendation banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-success/4 border border-success/10">
                <Brain className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-meta font-semibold text-foreground">Recommandation IA</p>
                  <p className="text-caption text-muted-foreground mt-0.5 leading-relaxed">Soumission B offre le meilleur rapport qualité-prix avec des matériaux haut de gamme et un délai plus court. Économie potentielle de 1 300$ par rapport à la moyenne.</p>
                </div>
              </div>

              <Button asChild size="lg" className="w-full rounded-xl">
                <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                  Analyser mes soumissions <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOME SCORE PREVIEW — Property intelligence
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative px-5 py-20 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Text */}
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <p className="text-caption font-semibold text-success tracking-widest uppercase mb-2">Score Maison</p>
              <h2 className="font-display text-title text-foreground">Connaissez la santé de votre propriété</h2>
              <p className="text-body text-muted-foreground mt-3 leading-relaxed">Un diagnostic complet de votre maison, alimenté par l'IA. Identifiez les priorités d'entretien et planifiez vos investissements.</p>
              <Button asChild size="lg" variant="success" className="rounded-xl mt-6">
                <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                  Calculer mon Score <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </motion.div>

            {/* Score visual */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="glass-card-elevated rounded-2xl p-6 space-y-5">
                {/* Score hero */}
                <div className="flex items-center gap-5">
                  <div className="relative h-24 w-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--success))" strokeWidth="5"
                        strokeDasharray="264" strokeDashoffset="47" strokeLinecap="round" className="score-ring" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-title font-bold text-foreground">82</span>
                      <span className="text-[9px] text-muted-foreground font-medium">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-body font-semibold text-foreground">Bon état général</p>
                    <p className="text-caption text-muted-foreground mt-0.5">2 points d'attention identifiés</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Structure", score: 88, color: "bg-success" },
                    { label: "Énergie", score: 74, color: "bg-warning" },
                    { label: "Toiture", score: 82, color: "bg-success" },
                    { label: "Humidité", score: 79, color: "bg-primary" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-muted/20 p-3 border border-border/15">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-caption font-medium text-muted-foreground">{s.label}</span>
                        <span className="text-caption font-bold text-foreground">{s.score}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FEATURED CONTRACTORS
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex items-end justify-between mb-10">
            <div>
              <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Entrepreneurs vedettes</p>
              <h2 className="font-display text-title text-foreground">Vérifiés, certifiés, recommandés</h2>
            </div>
            <Link to="/search" className="hidden sm:flex items-center gap-1.5 text-meta font-semibold text-primary hover:gap-2.5 transition-all">
              Voir tous <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-3 gap-3">
            {[
              { name: "TOITURE EXPERT", specialty: "Toiture & Couverture", city: "Montréal", score: 92, rating: 4.9, reviews: 47, years: 18 },
              { name: "PLOMBERIE PRO", specialty: "Plomberie", city: "Laval", score: 88, rating: 4.8, reviews: 34, years: 12 },
              { name: "RÉNO MAÎTRE", specialty: "Rénovation générale", city: "Québec", score: 85, rating: 4.7, reviews: 29, years: 15 },
            ].map((c, i) => (
              <motion.div key={c.name} variants={fadeUp} custom={i}>
                <Link to="/search" className="block h-full">
                  <div className="glass-card-elevated rounded-2xl p-5 h-full group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-primary/5 blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/12 to-secondary/8 flex items-center justify-center border border-border/20">
                          <span className="font-display text-body font-bold text-gradient">{c.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-meta font-semibold text-foreground truncate">{c.name}</h3>
                            <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
                          </div>
                          <p className="text-caption text-muted-foreground">{c.specialty}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-3 w-3 fill-current text-amber-400" />
                          <span className="text-caption font-bold text-foreground">{c.rating}</span>
                          <span className="text-caption text-muted-foreground/60">({c.reviews} avis)</span>
                        </div>
                        <div className="flex items-center gap-3 text-caption text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.years} ans</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/15 flex items-center justify-between">
                        <div className="bg-primary/8 border border-primary/12 text-primary font-display font-bold text-meta px-3 py-1.5 rounded-lg">
                          {c.score}<span className="text-caption font-normal opacity-50">/100</span>
                        </div>
                        <span className="text-[10px] font-semibold text-primary/50 uppercase tracking-wider">AIPP Score</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <div className="sm:hidden mt-4 text-center">
            <Link to="/search" className="text-meta font-semibold text-primary inline-flex items-center gap-1.5">
              Voir tous les entrepreneurs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY UNPRO
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative px-5 py-20 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Pourquoi UNPRO</p>
            <h2 className="font-display text-title text-foreground">Arrêtez de magasiner à l'aveugle</h2>
            <p className="text-body text-muted-foreground mt-3 max-w-md mx-auto">UNPRO remplace le processus traditionnel de comparaison de soumissions par une expérience intelligente et guidée.</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Brain, title: "Compréhension IA", desc: "Notre IA analyse vos soumissions comme un expert le ferait, en détectant les anomalies et les opportunités." },
              { icon: ShieldCheck, title: "Professionnels vérifiés", desc: "Chaque entrepreneur est vérifié : licences, assurances, références et historique de projets." },
              { icon: Zap, title: "Décisions rapides", desc: "Obtenez une analyse complète en 30 secondes au lieu de jours de recherche manuelle." },
              { icon: TrendingUp, title: "Moins de gaspillage", desc: "Identifiez les soumissions excessives et les clauses manquantes avant de signer." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i}>
                <div className="rounded-2xl border border-border/20 bg-card/40 p-6 h-full">
                  <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-body font-semibold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-meta text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TESTIMONIALS — Premium quote cards
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Témoignages</p>
            <h2 className="font-display text-title text-foreground">Ce que nos utilisateurs disent</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-3 gap-3">
            {[
              { name: "Marie-Claude D.", role: "Propriétaire · Montréal", text: "L'analyse IA m'a fait économiser 3 200$ sur ma rénovation. Un outil indispensable.", avatar: "MC" },
              { name: "Jean-François L.", role: "Entrepreneur · Laval", text: "Depuis UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé.", avatar: "JF" },
              { name: "Sophie T.", role: "Propriétaire · Québec", text: "Le Score Maison m'a permis de planifier un budget réaliste sur 5 ans.", avatar: "ST" },
            ].map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i}>
                <div className="glass-card-elevated rounded-2xl p-6 h-full space-y-4">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 fill-current text-amber-400" />)}
                  </div>
                  <p className="text-meta text-foreground/80 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border/15">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center border border-border/20">
                      <span className="text-caption font-bold text-foreground/70">{t.avatar}</span>
                    </div>
                    <div>
                      <p className="text-meta font-semibold text-foreground">{t.name}</p>
                      <p className="text-caption text-muted-foreground/60">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          ALEX AI SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="glass-card-elevated rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow animate-glow-pulse">
                <Brain className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display text-section font-semibold text-foreground">Alex <span className="text-muted-foreground font-normal">— Conseiller IA</span></h3>
                <p className="text-meta text-muted-foreground mt-1 leading-relaxed">Besoin d'aide pour décrire votre projet ou comprendre une soumission? Alex est là pour vous guider.</p>
              </div>
              <Button asChild size="lg" variant="outline" className="rounded-xl shrink-0">
                <Link to="/alex"><MessageCircle className="h-4 w-4 mr-1.5" /> Parler avec Alex</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/8 to-accent/5 border border-primary/12 p-10 md:p-16 text-center overflow-hidden">
              {/* Ambient */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-30%] left-[20%] w-[40%] h-[60%] rounded-full bg-primary/8 blur-[80px]" />
                <div className="absolute bottom-[-20%] right-[15%] w-[35%] h-[50%] rounded-full bg-secondary/6 blur-[60px]" />
              </div>

              <div className="relative z-10 space-y-6">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-display text-title md:text-hero-sm text-foreground">Lancez votre projet en toute confiance.</h2>
                <p className="text-body text-muted-foreground max-w-md mx-auto">
                  Créez votre compte gratuit et commencez à comparer les soumissions dès maintenant.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="xl" className="rounded-xl shadow-glow">
                    <Link to={isAuthenticated ? "/describe-project" : "/signup"}>
                      Décrire mon projet <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild size="xl" variant="outline" className="rounded-xl">
                    <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                      Comparer des soumissions
                    </Link>
                  </Button>
                </div>
                <div className="flex justify-center items-center gap-5 pt-2">
                  {[
                    { icon: CheckCircle2, label: "Gratuit" },
                    { icon: Shield, label: "Sécurisé" },
                    { icon: Heart, label: "Sans engagement" },
                  ].map(b => (
                    <div key={b.label} className="flex items-center gap-1">
                      <b.icon className="h-3 w-3 text-success/60" />
                      <span className="text-caption text-muted-foreground/60">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile bottom nav ── */}
      <nav className="sticky bottom-0 z-30 border-t border-border/20 bg-background/90 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around h-14 px-2">
          {[
            { icon: HomeIcon, label: "Accueil", to: "/", active: true },
            { icon: FolderOpen, label: "Projets", to: isAuthenticated ? "/dashboard" : "/login", active: false },
            { icon: HardHat, label: "Pros", to: "/search", active: false },
            { icon: Brain, label: "Alex", to: "/alex", active: false },
          ].map(item => (
            <Link key={item.label} to={item.to} className={`flex flex-col items-center gap-0.5 transition-colors ${item.active ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Home;
