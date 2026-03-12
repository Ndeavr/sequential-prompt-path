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
import HeroSection from "@/components/home/HeroSection";
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
    <div className="light flex flex-col min-h-screen" style={{ background: "#F0F4FA", color: "hsl(222 47% 11%)" }}>

      {/* ═══════════════════════════════════════════════════════════
          HERO — Premium rotating headline with pressable CTA
      ═══════════════════════════════════════════════════════════ */}
      <HeroSection />

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS — Bold cards with prominent numbered badges
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="font-display text-title sm:text-hero-sm font-bold mb-8" style={{ color: "hsl(222 47% 11%)" }}>Comment ça marche ?</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col sm:flex-row items-stretch gap-4">
            {[
              { step: 1, icon: FileText, title: "Décrivez", subtitle: "votre projet", gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)" },
              { step: 2, icon: BarChart3, title: "Comparez", subtitle: "les soumissions", gradient: "linear-gradient(135deg, #06B6D4, #67E8F9)" },
              { step: 3, icon: Trophy, title: "Choisissez", subtitle: "le meilleur pro", gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)" },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i} className="flex-1 relative">
                <div className="rounded-2xl p-6 text-center h-full relative overflow-hidden" style={{ background: "white", border: "1px solid hsl(220 25% 92%)", boxShadow: "0 4px 16px -4px hsl(220 40% 30% / 0.08)" }}>
                  {/* Bold numbered badge — top-right */}
                  <div className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: item.gradient, color: "white", boxShadow: "0 3px 10px -2px hsl(222 80% 55% / 0.3)" }}>
                    {item.step}
                  </div>
                  {/* Large icon container */}
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${item.gradient}15`, border: `2px solid ${item.gradient}25` }}>
                    <item.icon className="h-7 w-7" style={{ color: i === 0 ? "#3B82F6" : i === 1 ? "#06B6D4" : "#F59E0B" }} />
                  </div>
                  <p className="font-display text-section font-bold" style={{ color: "hsl(222 47% 11%)" }}>{item.title}</p>
                  <p className="text-meta mt-0.5" style={{ color: "hsl(220 12% 50%)" }}>{item.subtitle}</p>
                </div>
                {/* Dotted connector */}
                {i < 2 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 w-6 text-center">
                    <span className="text-meta tracking-[3px] font-bold" style={{ color: "hsl(222 60% 78%)" }}>···</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          STATS + BOLD CTA
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-8 md:py-10">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
              <div className="text-center">
                <p className="font-display text-hero-sm sm:text-hero font-bold" style={{ color: "#2563EB" }}>+10 000</p>
                <p className="text-meta font-medium" style={{ color: "hsl(220 12% 50%)" }}>projets réussis</p>
              </div>
              <div className="h-12 w-px" style={{ background: "hsl(220 25% 88%)" }} />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-current" style={{ color: "#F59E0B" }} />)}
                  <span className="font-display text-section font-bold ml-1.5" style={{ color: "hsl(222 47% 11%)" }}>4.9/5</span>
                </div>
                <p className="text-meta font-medium" style={{ color: "hsl(220 12% 50%)" }}>basé sur 2,500 avis</p>
              </div>
            </div>

            {/* BOLD CTA — Full gradient pill */}
            <button
              onClick={() => navigate(isAuthenticated ? "/describe-project" : "/signup")}
              className="w-full h-16 rounded-full flex items-center justify-center gap-4 text-body font-bold transition-all hover:scale-[1.01] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 40%, #06B6D4 100%)", color: "white", boxShadow: "0 8px 30px -4px hsl(222 90% 55% / 0.4), 0 2px 8px hsl(222 80% 50% / 0.15)" }}
            >
              <span className="text-[1.05rem] font-bold">Décrivez votre projet</span>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.25)" }}>
                <ArrowRight className="h-5 w-5" />
              </div>
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-5 sm:gap-7 mt-5">
              {[
                { icon: CheckCircle2, label: "Gratuit & Rapide" },
                { icon: Shield, label: "Sécurisé" },
                { icon: Heart, label: "Sans engagement" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <b.icon className="h-4 w-4" style={{ color: "#3B82F6" }} />
                  <span className="text-meta font-semibold" style={{ color: "hsl(220 15% 40%)" }}>{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SOCIAL PROOF BANNER — Bold gradient
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-8">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-3xl p-8 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #2563EB 35%, #3B82F6 65%, #06B6D4 100%)" }}>
              {/* Shine overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-50%] right-[-20%] w-[60%] h-[120%] rounded-full blur-3xl" style={{ background: "hsl(210 100% 80% / 0.15)" }} />
                <div className="absolute bottom-[-30%] left-[-10%] w-[40%] h-[80%] rounded-full blur-2xl" style={{ background: "hsl(195 100% 65% / 0.12)" }} />
              </div>

              <div className="relative z-10">
                <p className="font-display text-section sm:text-title font-bold mb-5" style={{ color: "white" }}>
                  Approuvé par des milliers de clients
                </p>
                <div className="flex items-center justify-center">
                  {/* Avatar circles */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden -ml-3 first:ml-0"
                      style={{ border: "3px solid hsl(0 0% 100% / 0.6)", boxShadow: "0 2px 8px hsl(220 40% 20% / 0.2)" }}
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
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center -ml-3" style={{ border: "3px solid hsl(0 0% 100% / 0.6)", background: "hsl(0 0% 100% / 0.2)", backdropFilter: "blur(8px)" }}>
                    <span className="text-meta font-black" style={{ color: "white" }}>+2k</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          QUOTE COMPARISON PREVIEW
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <p className="text-meta font-bold tracking-widest uppercase mb-2" style={{ color: "#2563EB" }}>Analyse IA des soumissions</p>
            <h2 className="font-display text-title sm:text-hero-sm font-bold" style={{ color: "hsl(222 47% 11%)" }}>Comparez 3 soumissions en 30 secondes</h2>
            <p className="text-body mt-3 max-w-md mx-auto" style={{ color: "hsl(220 12% 42%)" }}>Notre intelligence artificielle analyse prix, matériaux, couverture et clauses contractuelles.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="rounded-3xl p-5 md:p-8 space-y-5" style={{ background: "white", border: "1px solid hsl(220 25% 92%)", boxShadow: "0 8px 32px -6px hsl(220 40% 30% / 0.1)" }}>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { name: "Soum. A", price: "8 500$", score: 72, best: false },
                  { name: "Soum. B", price: "7 200$", score: 91, best: true },
                  { name: "Soum. C", price: "9 800$", score: 65, best: false },
                ].map(q => (
                  <div key={q.name} className="rounded-xl p-3 sm:p-4 transition-all" style={{ background: q.best ? "hsl(152 69% 51% / 0.05)" : "hsl(220 25% 97%)", border: q.best ? "2px solid hsl(152 69% 51% / 0.25)" : "1px solid hsl(220 20% 93%)" }}>
                    {q.best && (
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="text-[10px] font-black text-success uppercase tracking-wider">Recommandée</span>
                      </div>
                    )}
                    <p className="text-caption font-semibold" style={{ color: "hsl(220 12% 50%)" }}>{q.name}</p>
                    <p className="font-display text-section sm:text-title font-bold mt-1" style={{ color: "hsl(222 47% 11%)" }}>{q.price}</p>
                    <div className="mt-2 pt-2 text-center" style={{ borderTop: "1px solid hsl(220 20% 93%)" }}>
                      <p className={`font-display text-body font-bold ${q.best ? "text-success" : q.score < 70 ? "text-destructive" : ""}`} style={{ color: !q.best && q.score >= 70 ? "hsl(220 12% 46%)" : undefined }}>{q.score}<span className="text-caption font-normal opacity-50">/100</span></p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "hsl(152 69% 51% / 0.05)", border: "1px solid hsl(152 69% 51% / 0.15)" }}>
                <Brain className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-meta font-bold" style={{ color: "hsl(222 47% 11%)" }}>Recommandation IA</p>
                  <p className="text-caption mt-0.5 leading-relaxed" style={{ color: "hsl(220 12% 42%)" }}>Soumission B offre le meilleur rapport qualité-prix. Économie potentielle de 1 300$.</p>
                </div>
              </div>

              <button
                onClick={() => navigate(isAuthenticated ? "/dashboard/quotes/upload" : "/signup")}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-meta font-bold transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white", boxShadow: "0 4px 14px -3px hsl(222 90% 55% / 0.35)" }}
              >
                Analyser mes soumissions <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TRUST STRIP — Bold numbers
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: ShieldCheck, label: "Entrepreneurs vérifiés", value: "100%", color: "#2563EB" },
                { icon: Brain, label: "Analyse IA", value: "30 sec", color: "#06B6D4" },
                { icon: Users, label: "Propriétaires aidés", value: "10K+", color: "#8B5CF6" },
                { icon: Award, label: "Pros certifiés", value: "500+", color: "#F59E0B" },
              ].map((item) => (
                <div key={item.label} className="text-center space-y-2 p-5 rounded-2xl" style={{ background: "white", border: "1px solid hsl(220 25% 92%)", boxShadow: "0 2px 10px -3px hsl(220 30% 30% / 0.06)" }}>
                  <item.icon className="h-6 w-6 mx-auto" style={{ color: item.color }} />
                  <p className="font-display text-section font-bold" style={{ color: "hsl(222 47% 11%)" }}>{item.value}</p>
                  <p className="text-caption leading-tight font-medium" style={{ color: "hsl(220 12% 50%)" }}>{item.label}</p>
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(152 50% 95%), #F0F4FA, hsl(222 50% 95%))" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <p className="text-meta font-bold text-success tracking-widest uppercase mb-2">Score Maison</p>
              <h2 className="font-display text-title sm:text-hero-sm font-bold" style={{ color: "hsl(222 47% 11%)" }}>Connaissez la santé de votre propriété</h2>
              <p className="text-body mt-3 leading-relaxed" style={{ color: "hsl(220 12% 42%)" }}>Un diagnostic complet alimenté par l'IA. Identifiez les priorités d'entretien.</p>
              <button
                onClick={() => navigate(isAuthenticated ? "/dashboard/home-score" : "/signup")}
                className="mt-6 h-12 rounded-xl px-6 flex items-center gap-2 text-meta font-bold transition-all active:scale-[0.97]"
                style={{ background: "white", border: "2px solid hsl(152 69% 51% / 0.3)", color: "hsl(152 55% 38%)" }}
              >
                Calculer mon Score <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="rounded-2xl p-6 space-y-4" style={{ background: "white", border: "1px solid hsl(220 25% 92%)", boxShadow: "0 8px 32px -6px hsl(220 40% 30% / 0.1)" }}>
                <div className="flex items-center gap-5">
                  <div className="relative h-22 w-22 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(220 20% 92%)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#22C55E" strokeWidth="6"
                        strokeDasharray="264" strokeDashoffset="47" strokeLinecap="round" className="score-ring" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-title font-bold" style={{ color: "hsl(222 47% 11%)" }}>82</span>
                      <span className="text-[10px] font-semibold" style={{ color: "hsl(220 12% 55%)" }}>/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-body font-bold" style={{ color: "hsl(222 47% 11%)" }}>Bon état général</p>
                    <p className="text-caption font-medium" style={{ color: "hsl(220 12% 50%)" }}>2 points d'attention</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Structure", score: 88, color: "#22C55E" },
                    { label: "Énergie", score: 74, color: "#F59E0B" },
                    { label: "Toiture", score: 82, color: "#22C55E" },
                    { label: "Humidité", score: 79, color: "#3B82F6" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3" style={{ background: "hsl(220 25% 97%)", border: "1px solid hsl(220 20% 93%)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-caption font-medium" style={{ color: "hsl(220 12% 50%)" }}>{s.label}</span>
                        <span className="text-caption font-bold" style={{ color: "hsl(222 47% 11%)" }}>{s.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 20% 92%)" }}>
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
          FEATURED CONTRACTORS
      ═══════════════════════════════════════════════════════════ */}
      <FeaturedCarousel />

      {/* ═══════════════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <p className="text-meta font-bold tracking-widest uppercase mb-2" style={{ color: "#2563EB" }}>Témoignages</p>
            <h2 className="font-display text-title sm:text-hero-sm font-bold" style={{ color: "hsl(222 47% 11%)" }}>Ce que nos utilisateurs disent</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-3 gap-4">
            {[
              { name: "Marie-Claude D.", role: "Propriétaire · Montréal", text: "L'analyse IA m'a fait économiser 3 200$ sur ma rénovation." },
              { name: "Jean-François L.", role: "Entrepreneur · Laval", text: "Depuis UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé." },
              { name: "Sophie T.", role: "Propriétaire · Québec", text: "Le Score Maison m'a permis de planifier un budget réaliste sur 5 ans." },
            ].map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i}>
                <div className="rounded-2xl p-5 h-full space-y-3" style={{ background: "white", border: "1px solid hsl(220 25% 92%)", boxShadow: "0 4px 16px -4px hsl(220 40% 30% / 0.08)" }}>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-current" style={{ color: "#F59E0B" }} />)}
                  </div>
                  <p className="text-meta leading-relaxed font-medium" style={{ color: "hsl(222 47% 11% / 0.85)" }}>"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1px solid hsl(220 20% 94%)" }}>
                    <div className="h-10 w-10 rounded-full overflow-hidden" style={{ border: "2px solid hsl(220 25% 90%)" }}>
                      <img src={avatarsGroup} alt={t.name} className="h-full w-full object-cover" style={{ objectPosition: `${i * 30 + 10}% 15%` }} />
                    </div>
                    <div>
                      <p className="text-meta font-bold" style={{ color: "hsl(222 47% 11%)" }}>{t.name}</p>
                      <p className="text-caption" style={{ color: "hsl(220 12% 55%)" }}>{t.role}</p>
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, hsl(222 50% 95%), #F0F4FA, hsl(252 50% 95%))" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5" style={{ background: "white", border: "1px solid hsl(220 25% 92%)", boxShadow: "0 8px 32px -6px hsl(220 40% 30% / 0.1)" }}>
              <img src={unproRobot} alt="Alex IA" className="h-24 w-24 drop-shadow-xl" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display text-section font-bold" style={{ color: "hsl(222 47% 11%)" }}>Alex <span className="font-normal" style={{ color: "hsl(220 12% 50%)" }}>— Conseiller IA</span></h3>
                <p className="text-meta mt-1 leading-relaxed" style={{ color: "hsl(220 12% 42%)" }}>Besoin d'aide pour décrire votre projet? Alex est là pour vous guider.</p>
              </div>
              <button
                onClick={() => navigate("/alex")}
                className="shrink-0 h-11 rounded-xl px-5 flex items-center gap-2 text-meta font-bold transition-all active:scale-[0.97]"
                style={{ background: "white", border: "2px solid hsl(222 80% 60% / 0.25)", color: "#2563EB" }}
              >
                <MessageCircle className="h-4 w-4" /> Parler avec Alex
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA — Bold gradient card
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-3xl p-8 md:p-14 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(222 60% 96%), hsl(252 50% 96%), hsl(195 50% 96%))", border: "1px solid hsl(222 50% 88%)" }}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-30%] left-[20%] w-[40%] h-[60%] rounded-full blur-[80px]" style={{ background: "hsl(222 100% 65% / 0.1)" }} />
                <div className="absolute bottom-[-20%] right-[15%] w-[35%] h-[50%] rounded-full blur-[60px]" style={{ background: "hsl(195 100% 55% / 0.08)" }} />
              </div>

              <div className="relative z-10 space-y-5">
                <div className="h-14 w-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)", boxShadow: "0 6px 20px -4px hsl(222 90% 55% / 0.4)" }}>
                  <Sparkles className="h-6 w-6" style={{ color: "white" }} />
                </div>
                <h2 className="font-display text-title md:text-hero-sm font-bold" style={{ color: "hsl(222 47% 11%)" }}>Lancez votre projet en toute confiance.</h2>
                <p className="text-body max-w-md mx-auto" style={{ color: "hsl(220 12% 42%)" }}>
                  Créez votre compte gratuit et commencez à comparer les soumissions.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate(isAuthenticated ? "/describe-project" : "/signup")}
                    className="h-13 rounded-full px-8 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)", color: "white", boxShadow: "0 6px 24px -4px hsl(222 90% 55% / 0.4)" }}
                  >
                    Décrire mon projet <ArrowRight className="h-4 w-4 ml-1.5 inline" />
                  </button>
                  <button
                    onClick={() => navigate(isAuthenticated ? "/dashboard/quotes/upload" : "/signup")}
                    className="h-13 rounded-full px-8 text-sm font-bold transition-all active:scale-[0.97]"
                    style={{ background: "white", border: "2px solid hsl(220 25% 88%)", color: "hsl(222 47% 11%)" }}
                  >
                    Comparer des soumissions
                  </button>
                </div>
                <div className="flex justify-center items-center gap-5 pt-2">
                  {[
                    { icon: CheckCircle2, label: "Gratuit" },
                    { icon: Shield, label: "Sécurisé" },
                    { icon: Heart, label: "Sans engagement" },
                  ].map(b => (
                    <div key={b.label} className="flex items-center gap-1.5">
                      <b.icon className="h-3.5 w-3.5" style={{ color: "#22C55E" }} />
                      <span className="text-caption font-semibold" style={{ color: "hsl(220 12% 50%)" }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile bottom nav ── */}
      <nav className="sticky bottom-0 z-30 md:hidden" style={{ borderTop: "1px solid hsl(220 20% 90%)", background: "hsl(0 0% 100% / 0.95)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-around h-14 px-2">
          {[
            { icon: HomeIcon, label: "Accueil", to: "/", active: true },
            { icon: FolderOpen, label: "Projets", to: isAuthenticated ? "/dashboard" : "/login", active: false },
            { icon: HardHat, label: "Pros", to: "/search", active: false },
            { icon: Brain, label: "Alex", to: "/alex", active: false },
          ].map(item => (
            <Link key={item.label} to={item.to} className="flex flex-col items-center gap-0.5 transition-colors" style={{ color: item.active ? "#2563EB" : "hsl(220 12% 55%)" }}>
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Home;
