import { Link, useNavigate } from "react-router-dom";
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
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import { motion } from "framer-motion";
import { useState } from "react";
import heroHouse from "@/assets/hero-house.jpg";
import unproRobot from "@/assets/unpro-robot.png";
import avatarsGroup from "@/assets/avatars-group.jpg";

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

const popularTags = [
  { icon: "🏠", label: "Rénovation", color: "text-primary" },
  { icon: "🏗️", label: "Construction", color: "text-warning" },
  { icon: "📐", label: "Agrandissement", color: "text-success" },
];

const Home = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const dash = role === "contractor" ? "/pro" : role === "admin" ? "/admin" : "/dashboard";
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(isAuthenticated ? "/describe-project" : "/signup");
    } else {
      navigate(isAuthenticated ? "/describe-project" : "/signup");
    }
  };

  return (
    <div className="flex flex-col bg-background">

      {/* ═══════════════════════════════════════════════════════════
          HERO — Vibrant, image-rich, conversion-optimized
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Soft blue/white gradient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vw] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute bottom-[10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[100px]" />
        </div>

        {/* Wave overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 60C240 20 480 100 720 60C960 20 1200 100 1440 60V120H0V60Z" fill="hsl(var(--background))" fillOpacity="0.5" />
            <path d="M0 80C240 40 480 120 720 80C960 40 1200 120 1440 80V120H0V80Z" fill="hsl(var(--background))" />
          </svg>
        </div>

        <div className="relative z-10 px-5 pt-8 pb-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
              {/* Left content */}
              <motion.div className="flex-1 w-full" initial="hidden" animate="visible">
                {/* Headline */}
                <motion.h1
                  variants={fadeUp} custom={0}
                  className="font-display text-[1.75rem] sm:text-[2.5rem] md:text-[3rem] leading-[1.08] font-bold tracking-[-0.03em] text-foreground"
                >
                  Trouvez l'Entrepreneur{" "}
                  <span className="text-gradient">Idéal</span>{" "}
                  pour vos Travaux
                </motion.h1>

                {/* Subheadline */}
                <motion.p variants={fadeUp} custom={1} className="text-body text-muted-foreground leading-relaxed mt-3 max-w-md">
                  Comparez, évaluez et choisissez en toute confiance.
                </motion.p>

                {/* Search bar */}
                <motion.div variants={fadeUp} custom={2} className="mt-6">
                  <div className="glass-card-elevated rounded-2xl p-4 space-y-3">
                    <p className="font-display text-body font-semibold text-foreground">Quel type de travaux ?</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2.5 border border-border/30">
                        <HomeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          placeholder="Ex: Rénovation, cuisine, toiture..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          className="flex-1 bg-transparent text-meta text-foreground placeholder:text-muted-foreground/50 outline-none"
                        />
                      </div>
                      <button
                        onClick={handleSearch}
                        className="h-10 w-10 shrink-0 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-glow hover:shadow-glow-lg transition-shadow"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Popular tags */}
                <motion.div variants={fadeUp} custom={3} className="mt-4">
                  <p className="text-caption text-muted-foreground font-medium mb-2">Populaire</p>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map(tag => (
                      <Link
                        key={tag.label}
                        to={isAuthenticated ? "/describe-project" : "/signup"}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/40 text-meta font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                      >
                        <span>{tag.icon}</span>
                        <span className={tag.color}>{tag.label}</span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Right — House + Robot visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex-shrink-0 w-full max-w-[320px] lg:max-w-[400px]"
              >
                <img
                  src={heroHouse}
                  alt="Maison moderne de luxe"
                  className="rounded-3xl shadow-elevated w-full object-cover aspect-[4/3]"
                />
                {/* Robot mascot overlay */}
                <motion.img
                  src={unproRobot}
                  alt="Alex — Assistant IA UNPRO"
                  className="absolute -bottom-4 -right-4 lg:-right-8 w-28 lg:w-36 drop-shadow-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS — 3-step visual flow
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="font-display text-section sm:text-title font-bold text-foreground mb-8">Comment ça marche ?</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col sm:flex-row items-stretch gap-4">
            {[
              { step: 1, icon: FileText, title: "Décrivez", subtitle: "votre projet", color: "primary" },
              { step: 2, icon: BarChart3, title: "Comparez", subtitle: "les soumissions", color: "accent" },
              { step: 3, icon: Trophy, title: "Choisissez", subtitle: "le meilleur pro", color: "warning" },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i} className="flex-1 relative">
                <div className="glass-card-elevated rounded-2xl p-5 text-center h-full relative overflow-hidden">
                  {/* Step number badge */}
                  <div className={`absolute top-3 right-3 h-6 w-6 rounded-full bg-${item.color}/10 border border-${item.color}/20 flex items-center justify-center`}>
                    <span className={`text-[10px] font-bold text-${item.color}`}>{item.step}</span>
                  </div>
                  <div className={`h-12 w-12 rounded-xl bg-${item.color}/8 border border-${item.color}/12 flex items-center justify-center mx-auto mb-3`}>
                    <item.icon className={`h-5 w-5 text-${item.color}`} />
                  </div>
                  <p className="font-display text-body font-bold text-foreground">{item.title}</p>
                  <p className="text-caption text-muted-foreground">{item.subtitle}</p>
                </div>
                {/* Dotted connector */}
                {i < 2 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 w-6 text-center">
                    <span className="text-muted-foreground/30 text-meta tracking-[3px]">···</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          STATS + CTA
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
              <div className="text-center">
                <p className="font-display text-title sm:text-hero-sm font-bold text-primary">+10 000</p>
                <p className="text-caption text-muted-foreground">projets réussis</p>
              </div>
              <div className="h-10 w-px bg-border/50" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-current text-warning" />)}
                  <span className="font-display text-body font-bold text-foreground ml-1">4.9/5</span>
                </div>
                <p className="text-caption text-muted-foreground">basé sur 2,500 avis</p>
              </div>
            </div>

            {/* Big CTA */}
            <Button asChild size="xl" className="w-full rounded-2xl h-14 text-body shadow-glow hover:shadow-glow-lg transition-shadow">
              <Link to={isAuthenticated ? "/describe-project" : "/signup"}>
                Décrivez votre projet
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center ml-3">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </Button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4">
              {[
                { icon: CheckCircle2, label: "Gratuit & Rapide" },
                { icon: Shield, label: "Sécurisé" },
                { icon: Heart, label: "Sans engagement" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <b.icon className="h-3.5 w-3.5 text-primary/60" />
                  <span className="text-caption font-medium text-muted-foreground">{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SOCIAL PROOF BANNER
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-8">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center overflow-hidden">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary-foreground/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-accent/30 blur-2xl" />
              </div>

              <div className="relative z-10">
                <p className="font-display text-body sm:text-section font-bold text-primary-foreground mb-4">
                  Approuvé par des milliers de clients
                </p>
                <div className="flex items-center justify-center gap-1">
                  {/* Avatar circles from cropped group image */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-primary-foreground/30 overflow-hidden -ml-2 first:ml-0"
                    >
                      <img
                        src={avatarsGroup}
                        alt={`Client ${i + 1}`}
                        className="h-full w-full object-cover"
                        style={{
                          objectPosition: `${(i * 16) + 4}% ${i < 6 ? '15%' : '65%'}`,
                        }}
                      />
                    </div>
                  ))}
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-primary-foreground/30 bg-primary-foreground/20 flex items-center justify-center -ml-2">
                    <span className="text-caption font-bold text-primary-foreground">+2k</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          QUOTE COMPARISON PREVIEW — Flagship feature
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Analyse IA des soumissions</p>
            <h2 className="font-display text-title text-foreground">Comparez 3 soumissions en 30 secondes</h2>
            <p className="text-body text-muted-foreground mt-3 max-w-md mx-auto">Notre intelligence artificielle analyse prix, matériaux, couverture et clauses contractuelles.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="glass-card-elevated rounded-2xl p-5 md:p-8 space-y-5 border-glow">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { name: "Soum. A", contractor: "Réno Expert", price: "8 500$", score: 72, best: false },
                  { name: "Soum. B", contractor: "Pro Habitat", price: "7 200$", score: 91, best: true },
                  { name: "Soum. C", contractor: "QC Rénov", price: "9 800$", score: 65, best: false },
                ].map(q => (
                  <div key={q.name} className={`rounded-xl p-3 sm:p-4 transition-all ${q.best ? "bg-success/5 border border-success/20 shadow-soft" : "bg-muted/15 border border-border/20"}`}>
                    {q.best && (
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-success uppercase tracking-wider">Recommandée</span>
                      </div>
                    )}
                    <p className="text-caption font-medium text-muted-foreground">{q.name}</p>
                    <p className="font-display text-body sm:text-section font-bold text-foreground mt-1">{q.price}</p>
                    <div className="mt-2 pt-2 border-t border-border/20 text-center">
                      <p className={`font-display text-body font-bold ${q.best ? "text-success" : q.score < 70 ? "text-destructive" : "text-muted-foreground"}`}>{q.score}<span className="text-caption font-normal opacity-50">/100</span></p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-success/4 border border-success/10">
                <Brain className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-meta font-semibold text-foreground">Recommandation IA</p>
                  <p className="text-caption text-muted-foreground mt-0.5 leading-relaxed">Soumission B offre le meilleur rapport qualité-prix. Économie potentielle de 1 300$.</p>
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
          TRUST STRIP
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: ShieldCheck, label: "Entrepreneurs vérifiés", value: "100%" },
                { icon: Brain, label: "Analyse IA", value: "30 sec" },
                { icon: Users, label: "Propriétaires aidés", value: "10K+" },
                { icon: Award, label: "Pros certifiés", value: "500+" },
              ].map((item) => (
                <div key={item.label} className="text-center space-y-2 p-4 rounded-xl border border-border/20 bg-card/50">
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
          HOME SCORE PREVIEW
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-success/3 via-background to-primary/3" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <p className="text-caption font-semibold text-success tracking-widest uppercase mb-2">Score Maison</p>
              <h2 className="font-display text-title text-foreground">Connaissez la santé de votre propriété</h2>
              <p className="text-body text-muted-foreground mt-3 leading-relaxed">Un diagnostic complet alimenté par l'IA. Identifiez les priorités d'entretien.</p>
              <Button asChild size="lg" variant="outline" className="rounded-xl mt-6 border-success/30 text-success hover:bg-success/5">
                <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                  Calculer mon Score <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="glass-card-elevated rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-5">
                  <div className="relative h-20 w-20 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--success))" strokeWidth="5"
                        strokeDasharray="264" strokeDashoffset="47" strokeLinecap="round" className="score-ring" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-section font-bold text-foreground">82</span>
                      <span className="text-[9px] text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-body font-semibold text-foreground">Bon état général</p>
                    <p className="text-caption text-muted-foreground">2 points d'attention</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Structure", score: 88, color: "bg-success" },
                    { label: "Énergie", score: 74, color: "bg-warning" },
                    { label: "Toiture", score: 82, color: "bg-success" },
                    { label: "Humidité", score: 79, color: "bg-primary" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg bg-muted/20 p-2.5 border border-border/15">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-caption text-muted-foreground">{s.label}</span>
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
          FEATURED CONTRACTORS — Rotating Carousel
      ═══════════════════════════════════════════════════════════ */}
      <FeaturedCarousel />

      {/* ═══════════════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Témoignages</p>
            <h2 className="font-display text-title text-foreground">Ce que nos utilisateurs disent</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-3 gap-3">
            {[
              { name: "Marie-Claude D.", role: "Propriétaire · Montréal", text: "L'analyse IA m'a fait économiser 3 200$ sur ma rénovation." },
              { name: "Jean-François L.", role: "Entrepreneur · Laval", text: "Depuis UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé." },
              { name: "Sophie T.", role: "Propriétaire · Québec", text: "Le Score Maison m'a permis de planifier un budget réaliste sur 5 ans." },
            ].map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i}>
                <div className="glass-card-elevated rounded-2xl p-5 h-full space-y-3">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 fill-current text-warning" />)}
                  </div>
                  <p className="text-meta text-foreground/80 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border/15">
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-border/20">
                      <img src={avatarsGroup} alt={t.name} className="h-full w-full object-cover" style={{ objectPosition: `${i * 30 + 10}% 15%` }} />
                    </div>
                    <div>
                      <p className="text-caption font-semibold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground/60">{t.role}</p>
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
      <section className="relative px-5 py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-background to-secondary/3" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="glass-card-elevated rounded-2xl p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
              <img src={unproRobot} alt="Alex IA" className="h-20 w-20 drop-shadow-lg" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display text-section font-semibold text-foreground">Alex <span className="text-muted-foreground font-normal">— Conseiller IA</span></h3>
                <p className="text-meta text-muted-foreground mt-1 leading-relaxed">Besoin d'aide pour décrire votre projet? Alex est là pour vous guider.</p>
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
      <section className="px-5 py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/8 to-accent/5 border border-primary/12 p-8 md:p-14 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-30%] left-[20%] w-[40%] h-[60%] rounded-full bg-primary/8 blur-[80px]" />
                <div className="absolute bottom-[-20%] right-[15%] w-[35%] h-[50%] rounded-full bg-secondary/6 blur-[60px]" />
              </div>

              <div className="relative z-10 space-y-5">
                <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-display text-title md:text-hero-sm text-foreground">Lancez votre projet en toute confiance.</h2>
                <p className="text-body text-muted-foreground max-w-md mx-auto">
                  Créez votre compte gratuit et commencez à comparer les soumissions.
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
