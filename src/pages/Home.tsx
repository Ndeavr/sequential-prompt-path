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
    navigate(isAuthenticated ? "/describe-project" : "/signup");
  };

  return (
    <div className="light flex flex-col" style={{ background: "hsl(220 30% 98%)", color: "hsl(222 47% 11%)" }}>

      {/* ═══════════════════════════════════════════════════════════
          HERO — Luminous premium light aesthetic
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Luminous blue/white gradient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(210 60% 97%) 0%, hsl(220 40% 96%) 40%, hsl(220 30% 98%) 100%)" }} />
          <div className="absolute top-[-20%] right-[-15%] w-[70vw] h-[70vw] rounded-full" style={{ background: "radial-gradient(circle, hsl(222 100% 65% / 0.08) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[0%] left-[-20%] w-[50vw] h-[50vw] rounded-full" style={{ background: "radial-gradient(circle, hsl(195 100% 50% / 0.06) 0%, transparent 70%)" }} />
        </div>

        {/* Organic wave at bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
            <path d="M0 80C180 40 360 110 540 80C720 50 900 110 1080 80C1260 50 1380 90 1440 70V140H0V80Z" fill="hsl(222 100% 65%)" fillOpacity="0.04" />
            <path d="M0 100C200 70 400 130 600 100C800 70 1000 130 1200 100C1350 80 1440 110 1440 100V140H0V100Z" fill="hsl(220 30% 98%)" />
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
                  className="font-display text-[1.75rem] sm:text-[2.5rem] md:text-[3rem] leading-[1.08] font-bold tracking-[-0.03em]"
                  style={{ color: "hsl(222 47% 11%)" }}
                >
                  Trouvez l'Entrepreneur{" "}
                  <span className="text-gradient">Idéal</span>{" "}
                  pour vos Travaux
                </motion.h1>

                {/* Subheadline */}
                <motion.p variants={fadeUp} custom={1} className="text-body leading-relaxed mt-3 max-w-md" style={{ color: "hsl(220 10% 46%)" }}>
                  Comparez, évaluez et choisissez en toute confiance.
                </motion.p>

                {/* Search bar */}
                <motion.div variants={fadeUp} custom={2} className="mt-6">
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: "white", boxShadow: "0 4px 24px -4px hsl(220 30% 20% / 0.08), 0 1px 3px hsl(220 30% 20% / 0.05)", border: "1px solid hsl(220 16% 92%)" }}>
                    <p className="font-display text-body font-semibold" style={{ color: "hsl(222 47% 11%)" }}>Quel type de travaux ?</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "hsl(220 20% 97%)", border: "1px solid hsl(220 16% 92%)" }}>
                        <HomeIcon className="h-4 w-4 shrink-0" style={{ color: "hsl(220 10% 60%)" }} />
                        <input
                          type="text"
                          placeholder="Ex: Rénovation, cuisine, toiture..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          className="flex-1 bg-transparent text-meta outline-none placeholder:text-muted-foreground/50"
                          style={{ color: "hsl(222 47% 11%)" }}
                        />
                      </div>
                      <button
                        onClick={handleSearch}
                        className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-shadow"
                        style={{ background: "linear-gradient(135deg, hsl(222 100% 61%), hsl(195 100% 50%))", color: "white", boxShadow: "0 4px 14px -3px hsl(222 100% 61% / 0.4)" }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Popular tags */}
                <motion.div variants={fadeUp} custom={3} className="mt-4">
                  <p className="text-caption font-medium mb-2" style={{ color: "hsl(220 10% 55%)" }}>Populaire</p>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map(tag => (
                      <Link
                        key={tag.label}
                        to={isAuthenticated ? "/describe-project" : "/signup"}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-meta font-medium transition-all hover:shadow-soft"
                        style={{ background: "white", border: "1px solid hsl(220 16% 90%)", color: "hsl(222 47% 11%)" }}
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
                  className="rounded-3xl w-full object-cover aspect-[4/3]"
                  style={{ boxShadow: "0 20px 40px -10px hsl(220 30% 20% / 0.15)" }}
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
            <h2 className="font-display text-section sm:text-title font-bold mb-8" style={{ color: "hsl(222 47% 11%)" }}>Comment ça marche ?</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col sm:flex-row items-stretch gap-4">
            {[
              { step: 1, icon: FileText, title: "Décrivez", subtitle: "votre projet", color: "hsl(222 100% 61%)" },
              { step: 2, icon: BarChart3, title: "Comparez", subtitle: "les soumissions", color: "hsl(195 100% 50%)" },
              { step: 3, icon: Trophy, title: "Choisissez", subtitle: "le meilleur pro", color: "hsl(38 92% 50%)" },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i} className="flex-1 relative">
                <div className="rounded-2xl p-5 text-center h-full relative overflow-hidden" style={{ background: "white", border: "1px solid hsl(220 16% 92%)", boxShadow: "0 2px 8px -2px hsl(220 30% 20% / 0.06)" }}>
                  {/* Step number badge */}
                  <div className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: `${item.color}10`, border: `1px solid ${item.color}25` }}>
                    <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.step}</span>
                  </div>
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${item.color}0D`, border: `1px solid ${item.color}1A` }}>
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <p className="font-display text-body font-bold" style={{ color: "hsl(222 47% 11%)" }}>{item.title}</p>
                  <p className="text-caption" style={{ color: "hsl(220 10% 55%)" }}>{item.subtitle}</p>
                </div>
                {/* Dotted connector */}
                {i < 2 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 w-6 text-center">
                    <span className="text-meta tracking-[3px]" style={{ color: "hsl(220 16% 82%)" }}>···</span>
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
                <p className="text-caption" style={{ color: "hsl(220 10% 55%)" }}>projets réussis</p>
              </div>
              <div className="h-10 w-px" style={{ background: "hsl(220 16% 90%)" }} />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-current text-warning" />)}
                  <span className="font-display text-body font-bold ml-1" style={{ color: "hsl(222 47% 11%)" }}>4.9/5</span>
                </div>
                <p className="text-caption" style={{ color: "hsl(220 10% 55%)" }}>basé sur 2,500 avis</p>
              </div>
            </div>

            {/* Big CTA — Pill style with gradient */}
            <button
              onClick={() => navigate(isAuthenticated ? "/describe-project" : "/signup")}
              className="w-full h-14 rounded-full flex items-center justify-center gap-3 text-body font-bold transition-all hover:shadow-glow-lg"
              style={{ background: "linear-gradient(135deg, hsl(222 100% 61%), hsl(195 100% 50%))", color: "white", boxShadow: "0 6px 24px -4px hsl(222 100% 61% / 0.35)" }}
            >
              <span>Décrivez votre projet</span>
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.25)" }}>
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4">
              {[
                { icon: CheckCircle2, label: "Gratuit & Rapide" },
                { icon: Shield, label: "Sécurisé" },
                { icon: Heart, label: "Sans engagement" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <b.icon className="h-3.5 w-3.5" style={{ color: "hsl(222 100% 65% / 0.6)" }} />
                  <span className="text-caption font-medium" style={{ color: "hsl(220 10% 55%)" }}>{b.label}</span>
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
            <div className="relative rounded-2xl p-6 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(222 100% 61%), hsl(222 100% 55%))" }}>
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.12 }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl" style={{ background: "hsl(0 0% 100% / 0.3)" }} />
                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-2xl" style={{ background: "hsl(195 100% 50% / 0.4)" }} />
              </div>

              <div className="relative z-10">
                <p className="font-display text-body sm:text-section font-bold mb-4" style={{ color: "white" }}>
                  Approuvé par des milliers de clients
                </p>
                <div className="flex items-center justify-center gap-1">
                  {/* Avatar circles from cropped group image */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden -ml-2 first:ml-0"
                      style={{ border: "2.5px solid hsl(0 0% 100% / 0.5)" }}
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
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center -ml-2" style={{ border: "2.5px solid hsl(0 0% 100% / 0.5)", background: "hsl(0 0% 100% / 0.2)" }}>
                    <span className="text-caption font-bold" style={{ color: "white" }}>+2k</span>
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
            <h2 className="font-display text-title" style={{ color: "hsl(222 47% 11%)" }}>Comparez 3 soumissions en 30 secondes</h2>
            <p className="text-body mt-3 max-w-md mx-auto" style={{ color: "hsl(220 10% 46%)" }}>Notre intelligence artificielle analyse prix, matériaux, couverture et clauses contractuelles.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="rounded-2xl p-5 md:p-8 space-y-5" style={{ background: "white", border: "1px solid hsl(220 16% 92%)", boxShadow: "0 4px 24px -4px hsl(220 30% 20% / 0.08)" }}>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { name: "Soum. A", contractor: "Réno Expert", price: "8 500$", score: 72, best: false },
                  { name: "Soum. B", contractor: "Pro Habitat", price: "7 200$", score: 91, best: true },
                  { name: "Soum. C", contractor: "QC Rénov", price: "9 800$", score: 65, best: false },
                ].map(q => (
                  <div key={q.name} className={`rounded-xl p-3 sm:p-4 transition-all ${q.best ? "border shadow-soft" : "border"}`} style={{ background: q.best ? "hsl(152 69% 51% / 0.04)" : "hsl(220 20% 98%)", borderColor: q.best ? "hsl(152 69% 51% / 0.2)" : "hsl(220 16% 93%)" }}>
                    {q.best && (
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-success uppercase tracking-wider">Recommandée</span>
                      </div>
                    )}
                    <p className="text-caption font-medium" style={{ color: "hsl(220 10% 55%)" }}>{q.name}</p>
                    <p className="font-display text-body sm:text-section font-bold mt-1" style={{ color: "hsl(222 47% 11%)" }}>{q.price}</p>
                    <div className="mt-2 pt-2 border-t text-center" style={{ borderColor: "hsl(220 16% 93%)" }}>
                      <p className={`font-display text-body font-bold ${q.best ? "text-success" : q.score < 70 ? "text-destructive" : ""}`} style={{ color: !q.best && q.score >= 70 ? "hsl(220 10% 46%)" : undefined }}>{q.score}<span className="text-caption font-normal opacity-50">/100</span></p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "hsl(152 69% 51% / 0.04)", border: "1px solid hsl(152 69% 51% / 0.12)" }}>
                <Brain className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-meta font-semibold" style={{ color: "hsl(222 47% 11%)" }}>Recommandation IA</p>
                  <p className="text-caption mt-0.5 leading-relaxed" style={{ color: "hsl(220 10% 46%)" }}>Soumission B offre le meilleur rapport qualité-prix. Économie potentielle de 1 300$.</p>
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
                <div key={item.label} className="text-center space-y-2 p-4 rounded-xl" style={{ background: "white", border: "1px solid hsl(220 16% 92%)" }}>
                  <item.icon className="h-5 w-5 text-primary mx-auto" />
                  <p className="font-display text-body font-bold" style={{ color: "hsl(222 47% 11%)" }}>{item.value}</p>
                  <p className="text-caption leading-tight" style={{ color: "hsl(220 10% 55%)" }}>{item.label}</p>
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(152 69% 51% / 0.03), hsl(220 30% 98%), hsl(222 100% 61% / 0.03))" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <p className="text-caption font-semibold text-success tracking-widest uppercase mb-2">Score Maison</p>
              <h2 className="font-display text-title" style={{ color: "hsl(222 47% 11%)" }}>Connaissez la santé de votre propriété</h2>
              <p className="text-body mt-3 leading-relaxed" style={{ color: "hsl(220 10% 46%)" }}>Un diagnostic complet alimenté par l'IA. Identifiez les priorités d'entretien.</p>
              <Button asChild size="lg" variant="outline" className="rounded-xl mt-6 border-success/30 text-success hover:bg-success/5">
                <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                  Calculer mon Score <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="rounded-2xl p-6 space-y-4" style={{ background: "white", border: "1px solid hsl(220 16% 92%)", boxShadow: "0 4px 24px -4px hsl(220 30% 20% / 0.08)" }}>
                <div className="flex items-center gap-5">
                  <div className="relative h-20 w-20 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(220 16% 92%)" strokeWidth="5" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(152 69% 51%)" strokeWidth="5"
                        strokeDasharray="264" strokeDashoffset="47" strokeLinecap="round" className="score-ring" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-section font-bold" style={{ color: "hsl(222 47% 11%)" }}>82</span>
                      <span className="text-[9px]" style={{ color: "hsl(220 10% 55%)" }}>/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-body font-semibold" style={{ color: "hsl(222 47% 11%)" }}>Bon état général</p>
                    <p className="text-caption" style={{ color: "hsl(220 10% 55%)" }}>2 points d'attention</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Structure", score: 88, color: "hsl(152 69% 51%)" },
                    { label: "Énergie", score: 74, color: "hsl(38 92% 50%)" },
                    { label: "Toiture", score: 82, color: "hsl(152 69% 51%)" },
                    { label: "Humidité", score: 79, color: "hsl(222 100% 61%)" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg p-2.5" style={{ background: "hsl(220 20% 97%)", border: "1px solid hsl(220 16% 94%)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-caption" style={{ color: "hsl(220 10% 55%)" }}>{s.label}</span>
                        <span className="text-caption font-bold" style={{ color: "hsl(222 47% 11%)" }}>{s.score}</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsl(220 16% 92%)" }}>
                        <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: s.color }} />
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
            <h2 className="font-display text-title" style={{ color: "hsl(222 47% 11%)" }}>Ce que nos utilisateurs disent</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-3 gap-3">
            {[
              { name: "Marie-Claude D.", role: "Propriétaire · Montréal", text: "L'analyse IA m'a fait économiser 3 200$ sur ma rénovation." },
              { name: "Jean-François L.", role: "Entrepreneur · Laval", text: "Depuis UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé." },
              { name: "Sophie T.", role: "Propriétaire · Québec", text: "Le Score Maison m'a permis de planifier un budget réaliste sur 5 ans." },
            ].map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i}>
                <div className="rounded-2xl p-5 h-full space-y-3" style={{ background: "white", border: "1px solid hsl(220 16% 92%)", boxShadow: "0 2px 8px -2px hsl(220 30% 20% / 0.06)" }}>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 fill-current text-warning" />)}
                  </div>
                  <p className="text-meta leading-relaxed" style={{ color: "hsl(222 47% 11% / 0.8)" }}>"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid hsl(220 16% 94%)" }}>
                    <div className="h-8 w-8 rounded-full overflow-hidden" style={{ border: "1px solid hsl(220 16% 92%)" }}>
                      <img src={avatarsGroup} alt={t.name} className="h-full w-full object-cover" style={{ objectPosition: `${i * 30 + 10}% 15%` }} />
                    </div>
                    <div>
                      <p className="text-caption font-semibold" style={{ color: "hsl(222 47% 11%)" }}>{t.name}</p>
                      <p className="text-[10px]" style={{ color: "hsl(220 10% 55% / 0.7)" }}>{t.role}</p>
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, hsl(222 100% 61% / 0.03), hsl(220 30% 98%), hsl(252 100% 65% / 0.03))" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="rounded-2xl p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-5" style={{ background: "white", border: "1px solid hsl(220 16% 92%)", boxShadow: "0 4px 24px -4px hsl(220 30% 20% / 0.08)" }}>
              <img src={unproRobot} alt="Alex IA" className="h-20 w-20 drop-shadow-lg" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display text-section font-semibold" style={{ color: "hsl(222 47% 11%)" }}>Alex <span className="font-normal" style={{ color: "hsl(220 10% 55%)" }}>— Conseiller IA</span></h3>
                <p className="text-meta mt-1 leading-relaxed" style={{ color: "hsl(220 10% 46%)" }}>Besoin d'aide pour décrire votre projet? Alex est là pour vous guider.</p>
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
            <div className="relative rounded-3xl p-8 md:p-14 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(222 100% 61% / 0.06), hsl(252 100% 65% / 0.04), hsl(195 100% 50% / 0.03))", border: "1px solid hsl(222 100% 61% / 0.1)" }}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-30%] left-[20%] w-[40%] h-[60%] rounded-full blur-[80px]" style={{ background: "hsl(222 100% 61% / 0.06)" }} />
                <div className="absolute bottom-[-20%] right-[15%] w-[35%] h-[50%] rounded-full blur-[60px]" style={{ background: "hsl(252 100% 65% / 0.04)" }} />
              </div>

              <div className="relative z-10 space-y-5">
                <div className="h-12 w-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "hsl(222 100% 61% / 0.08)", border: "1px solid hsl(222 100% 61% / 0.15)" }}>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-display text-title md:text-hero-sm" style={{ color: "hsl(222 47% 11%)" }}>Lancez votre projet en toute confiance.</h2>
                <p className="text-body max-w-md mx-auto" style={{ color: "hsl(220 10% 46%)" }}>
                  Créez votre compte gratuit et commencez à comparer les soumissions.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate(isAuthenticated ? "/describe-project" : "/signup")}
                    className="h-12 rounded-full px-8 text-sm font-bold transition-all hover:shadow-glow-lg"
                    style={{ background: "linear-gradient(135deg, hsl(222 100% 61%), hsl(195 100% 50%))", color: "white", boxShadow: "0 4px 14px -3px hsl(222 100% 61% / 0.35)" }}
                  >
                    Décrire mon projet <ArrowRight className="h-4 w-4 ml-1 inline" />
                  </button>
                  <Button asChild size="xl" variant="outline" className="rounded-full">
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
                      <b.icon className="h-3 w-3" style={{ color: "hsl(152 69% 51% / 0.6)" }} />
                      <span className="text-caption" style={{ color: "hsl(220 10% 55% / 0.7)" }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile bottom nav ── */}
      <nav className="sticky bottom-0 z-30 md:hidden" style={{ borderTop: "1px solid hsl(220 16% 92%)", background: "hsl(0 0% 100% / 0.92)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-around h-14 px-2">
          {[
            { icon: HomeIcon, label: "Accueil", to: "/", active: true },
            { icon: FolderOpen, label: "Projets", to: isAuthenticated ? "/dashboard" : "/login", active: false },
            { icon: HardHat, label: "Pros", to: "/search", active: false },
            { icon: Brain, label: "Alex", to: "/alex", active: false },
          ].map(item => (
            <Link key={item.label} to={item.to} className="flex flex-col items-center gap-0.5 transition-colors" style={{ color: item.active ? "hsl(222 100% 61%)" : "hsl(220 10% 55%)" }}>
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
