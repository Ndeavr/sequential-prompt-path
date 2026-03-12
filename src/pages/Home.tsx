import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AlexAssistantSheet from "@/components/alex/AlexAssistantSheet";
import {
  Home as HomeIcon, Shield, ArrowRight, Star, Brain,
  MessageCircle, Heart, HardHat,
  FileText, Trophy, CheckCircle2,
  BarChart3, Zap, ShieldCheck, Camera,
  Award, Users, FolderOpen,
  Building, Vote, Wrench, PiggyBank, ClipboardList,
  Droplets, Leaf, Sparkles,
} from "lucide-react";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import HeroSection from "@/components/home/HeroSection";
import { motion } from "framer-motion";
import { useState } from "react";
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

const Home = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const dash = role === "contractor" ? "/pro" : role === "admin" ? "/admin" : "/dashboard";

  const [alexOpen, setAlexOpen] = useState(false);
  const [alexChip, setAlexChip] = useState<string | undefined>();

  const handleCta = (destination: string, label?: string) => {
    if (isAuthenticated) {
      navigate(destination);
    } else {
      setAlexChip(label);
      setAlexOpen(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">

      {/* ═══ HERO ═══ */}
      <HeroSection />

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="px-5 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="section-title mb-8">Comment ça marche ?</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { step: 1, icon: FileText, title: "Décrivez", subtitle: "votre projet", iconColor: "text-primary" },
              { step: 2, icon: BarChart3, title: "Comparez", subtitle: "les soumissions", iconColor: "text-accent" },
              { step: 3, icon: Trophy, title: "Choisissez", subtitle: "le meilleur pro", iconColor: "text-warning" },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i} className="relative">
                <div className="premium-card rounded-2xl p-3 sm:p-6 text-center h-full relative overflow-hidden">
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-primary flex items-center justify-center text-[10px] sm:text-[11px] font-black text-primary-foreground shadow-sm">
                    {item.step}
                  </div>
                  <div className="h-10 w-10 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-4 bg-muted/60 border border-border/50">
                    <item.icon className={`h-5 w-5 sm:h-7 sm:w-7 ${item.iconColor}`} />
                  </div>
                  <p className="font-display text-sm sm:text-section font-bold text-foreground">{item.title}</p>
                  <p className="text-xs sm:text-meta mt-0.5 text-muted-foreground">{item.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ STATS + BOLD CTA ═══ */}
      <section className="px-5 py-8 md:py-10">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
              <div className="text-center">
                <p className="font-display text-hero-sm sm:text-hero font-bold text-primary">+10 000</p>
                <p className="text-meta font-medium text-muted-foreground">projets réussis</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-current text-warning" />)}
                  <span className="font-display text-section font-bold ml-1.5 text-foreground">4.9/5</span>
                </div>
                <p className="text-meta font-medium text-muted-foreground">basé sur 2,500 avis</p>
              </div>
            </div>

            {/* BOLD CTA */}
            <button
              onClick={() => handleCta("/describe-project", "Décrire mon projet")}
              className="w-full h-16 rounded-full flex items-center justify-center gap-4 text-body font-bold cta-gradient"
            >
              <span className="text-[1.05rem] font-bold">Décrivez votre projet</span>
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-white/25">
                <ArrowRight className="h-5 w-5" />
              </div>
            </button>

            {/* Trust badges */}
            <div className="trust-row mt-5">
              {[
                { icon: CheckCircle2, label: "Gratuit & Rapide" },
                { icon: Shield, label: "Sécurisé" },
                { icon: Heart, label: "Sans engagement" },
              ].map(b => (
                <div key={b.label} className="trust-item">
                  <b.icon />
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BANNER ═══ */}
      <section className="px-5 py-8">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-3xl p-8 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary)), hsl(var(--accent)))" }}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-50%] right-[-20%] w-[60%] h-[120%] rounded-full blur-3xl bg-primary-foreground/15" />
                <div className="absolute bottom-[-30%] left-[-10%] w-[40%] h-[80%] rounded-full blur-2xl bg-accent/12" />
              </div>

              <div className="relative z-10">
                <p className="font-display text-section sm:text-title font-bold mb-5 text-white">
                  Approuvé par des milliers de clients
                </p>
                <div className="flex items-center justify-center">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden -ml-3 first:ml-0 border-[3px] border-white/60 shadow-md"
                    >
                      <img
                        src={avatarsGroup}
                        alt={`Client ${i + 1}`}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: `${(i * 16) + 4}% 15%` }}
                      />
                    </div>
                  ))}
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center -ml-3 border-[3px] border-white/60 bg-white/20 backdrop-blur-md">
                    <span className="text-meta font-black text-white">+2k</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ QUOTE COMPARISON PREVIEW ═══ */}
      <section className="px-5 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <p className="section-label">Analyse IA des soumissions</p>
            <h2 className="section-title">Comparez 3 soumissions en 30 secondes</h2>
            <p className="section-desc">Notre intelligence artificielle analyse prix, matériaux, couverture et clauses contractuelles.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="premium-card rounded-3xl p-5 md:p-8 space-y-5">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { name: "Soum. A", price: "8 500$", score: 72, best: false },
                  { name: "Soum. B", price: "7 200$", score: 91, best: true },
                  { name: "Soum. C", price: "9 800$", score: 65, best: false },
                ].map(q => (
                  <div key={q.name} className={`rounded-xl p-3 sm:p-4 transition-all ${q.best ? "bg-success/5 border-2 border-success/25" : "bg-muted/50 border border-border/60"}`}>
                    {q.best && (
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="text-[10px] font-black text-success uppercase tracking-wider">Recommandée</span>
                      </div>
                    )}
                    <p className="text-caption font-semibold text-muted-foreground">{q.name}</p>
                    <p className="font-display text-section sm:text-title font-bold mt-1 text-foreground">{q.price}</p>
                    <div className="mt-2 pt-2 text-center border-t border-border/40">
                      <p className={`font-display text-body font-bold ${q.best ? "text-success" : q.score < 70 ? "text-destructive" : "text-muted-foreground"}`}>
                        {q.score}<span className="text-caption font-normal opacity-50">/100</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-success/5 border border-success/15">
                <Brain className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-meta font-bold text-foreground">Recommandation IA</p>
                  <p className="text-caption mt-0.5 leading-relaxed text-muted-foreground">Soumission B offre le meilleur rapport qualité-prix. Économie potentielle de 1 300$.</p>
                </div>
              </div>

              <button
                onClick={() => handleCta("/dashboard/quotes/upload", "Analyser mes soumissions")}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-meta font-bold cta-gradient"
              >
                Analyser mes soumissions <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="px-5 py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: ShieldCheck, label: "Entrepreneurs vérifiés", value: "100%", iconColor: "text-primary" },
                { icon: Brain, label: "Analyse IA", value: "30 sec", iconColor: "text-accent" },
                { icon: Users, label: "Propriétaires aidés", value: "10K+", iconColor: "text-secondary" },
                { icon: Award, label: "Pros certifiés", value: "500+", iconColor: "text-warning" },
              ].map((item) => (
                <div key={item.label} className="stat-card">
                  <item.icon className={`h-6 w-6 mx-auto ${item.iconColor}`} />
                  <p className="font-display text-section font-bold text-foreground">{item.value}</p>
                  <p className="text-caption leading-tight font-medium text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ HOME SCORE PREVIEW ═══ */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-background to-primary/5" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <p className="section-label !text-success">Score Maison</p>
              <h2 className="section-title">Connaissez la santé de votre propriété</h2>
              <p className="text-body mt-3 leading-relaxed text-muted-foreground">Un diagnostic complet alimenté par l'IA. Identifiez les priorités d'entretien.</p>
              <button
                onClick={() => handleCta("/dashboard/home-score", "Calculer mon Score Maison")}
                className="mt-6 h-12 rounded-xl px-6 flex items-center gap-2 text-meta font-bold bg-card border-2 border-success/30 text-success hover:border-success/50 transition-all active:scale-[0.97]"
              >
                Calculer mon Score <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="premium-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-5">
                  <div className="relative h-22 w-22 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" className="stroke-border" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" className="stroke-success" strokeWidth="6"
                        strokeDasharray="264" strokeDashoffset="47" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-title font-bold text-foreground">82</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-body font-bold text-foreground">Bon état général</p>
                    <p className="text-caption font-medium text-muted-foreground">2 points d'attention</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Structure", score: 88, barColor: "bg-success" },
                    { label: "Énergie", score: 74, barColor: "bg-warning" },
                    { label: "Toiture", score: 82, barColor: "bg-success" },
                    { label: "Humidité", score: 79, barColor: "bg-primary" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 bg-muted/50 border border-border/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-caption font-medium text-muted-foreground">{s.label}</span>
                        <span className="text-caption font-bold text-foreground">{s.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-border/60">
                        <div className={`h-full rounded-full ${s.barColor}`} style={{ width: `${s.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURED CONTRACTORS ═══ */}
      <FeaturedCarousel />

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="px-5 py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <p className="section-label">Témoignages</p>
            <h2 className="section-title">Ce que nos utilisateurs disent</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-3 gap-4">
            {[
              { name: "Marie-Claude D.", role: "Propriétaire · Montréal", text: "L'analyse IA m'a fait économiser 3 200$ sur ma rénovation." },
              { name: "Jean-François L.", role: "Entrepreneur · Laval", text: "Depuis UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé." },
              { name: "Sophie T.", role: "Propriétaire · Québec", text: "Le Score Maison m'a permis de planifier un budget réaliste sur 5 ans." },
            ].map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i}>
                <div className="premium-card rounded-2xl p-5 h-full space-y-3">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-current text-warning" />)}
                  </div>
                  <p className="text-meta leading-relaxed font-medium text-foreground/85">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-border/60">
                      <img src={avatarsGroup} alt={t.name} className="h-full w-full object-cover" style={{ objectPosition: `${i * 30 + 10}% 15%` }} />
                    </div>
                    <div>
                      <p className="text-meta font-bold text-foreground">{t.name}</p>
                      <p className="text-caption text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ ALEX AI SECTION ═══ */}
      <section className="relative px-5 py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-background to-secondary/5" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="premium-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
              <img src={unproRobot} alt="Alex IA" className="h-24 w-24 drop-shadow-xl" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display text-section font-bold text-foreground">Alex <span className="font-normal text-muted-foreground">— Conseiller IA</span></h3>
                <p className="text-meta mt-1 leading-relaxed text-muted-foreground">Besoin d'aide pour décrire votre projet? Alex est là pour vous guider.</p>
              </div>
              <button
                onClick={() => navigate("/alex")}
                className="shrink-0 h-11 rounded-xl px-5 flex items-center gap-2 text-meta font-bold bg-card border-2 border-primary/25 text-primary hover:border-primary/40 transition-all active:scale-[0.97]"
              >
                <MessageCircle className="h-4 w-4" /> Parler avec Alex
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CONDO / SYNDICATE SECTION ═══ */}
      <section className="px-5 py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <p className="section-label !text-secondary">Condominiums</p>
            <h2 className="section-title">Gestion intelligente de copropriété</h2>
            <p className="section-desc max-w-lg">
              Tout ce dont votre syndicat a besoin : maintenance, fonds de prévoyance, votes et suivi des réparations.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Building, title: "Gestion d'immeuble", desc: "Suivi complet de votre copropriété", iconColor: "text-secondary" },
              { icon: Wrench, title: "Réparations", desc: "Planification et suivi des travaux", iconColor: "text-primary" },
              { icon: ClipboardList, title: "Maintenance", desc: "Calendrier d'entretien préventif", iconColor: "text-accent" },
              { icon: PiggyBank, title: "Fonds de prévoyance", desc: "Projections et réserves financières", iconColor: "text-success" },
              { icon: Vote, title: "Votes & Quorum", desc: "Assemblées et résolutions en ligne", iconColor: "text-warning" },
              { icon: BarChart3, title: "Rapports", desc: "Tableaux de bord et historiques", iconColor: "text-destructive" },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i}>
                <div className="premium-card rounded-2xl p-4 sm:p-5 h-full space-y-2">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-muted/60 border border-border/50">
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <p className="text-meta font-bold text-foreground">{item.title}</p>
                  <p className="text-caption leading-snug text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 text-center">
            <button
              onClick={() => handleCta("/dashboard/syndicate", "Gérer ma copropriété")}
              className="h-12 rounded-xl px-7 inline-flex items-center gap-2 text-meta font-bold bg-secondary text-secondary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.97]"
            >
              Gérer ma copropriété <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ═══ SERVICES ═══ */}
      <section className="px-5 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="section-label !text-accent">Services résidentiels</p>
            <h2 className="font-display text-section sm:text-title font-bold mb-6 text-foreground">Entretien courant pour votre propriété</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-wrap gap-2.5">
            {[
              { icon: Droplets, label: "Nettoyage de fenêtres" },
              { icon: Leaf, label: "Entretien de gazon" },
              { icon: Wrench, label: "Plomberie" },
              { icon: Zap, label: "Électricité" },
              { icon: ShieldCheck, label: "Déneigement" },
              { icon: Camera, label: "Inspection" },
            ].map((svc, i) => (
              <motion.button
                key={svc.label}
                variants={fadeUp}
                custom={i}
                onClick={() => handleCta("/search", svc.label)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-meta font-semibold bg-card border border-border/60 text-foreground shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-[0.97] transition-all"
              >
                <svc.icon className="h-4 w-4 text-accent" />
                {svc.label}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="px-5 py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-3xl p-8 md:p-14 text-center overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border border-border">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-30%] left-[20%] w-[40%] h-[60%] rounded-full blur-[80px] bg-primary/10" />
                <div className="absolute bottom-[-20%] right-[15%] w-[35%] h-[50%] rounded-full blur-[60px] bg-accent/8" />
              </div>

              <div className="relative z-10 space-y-5">
                <div className="h-14 w-14 mx-auto rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-accent shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h2 className="section-title">Lancez votre projet en toute confiance.</h2>
                <p className="text-body max-w-md mx-auto text-muted-foreground">
                  Créez votre compte gratuit et commencez à comparer les soumissions.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => handleCta("/describe-project", "Décrire mon projet")}
                    className="h-13 rounded-full px-8 text-sm font-bold cta-gradient"
                  >
                    Décrire mon projet <ArrowRight className="h-4 w-4 ml-1.5 inline" />
                  </button>
                  <button
                    onClick={() => handleCta("/dashboard/quotes/upload", "Comparer des soumissions")}
                    className="h-13 rounded-full px-8 text-sm font-bold bg-card border-2 border-border text-foreground hover:border-primary/30 transition-all active:scale-[0.97]"
                  >
                    Comparer des soumissions
                  </button>
                </div>
                <div className="trust-row pt-2">
                  {[
                    { icon: CheckCircle2, label: "Gratuit" },
                    { icon: Shield, label: "Sécurisé" },
                    { icon: Heart, label: "Sans engagement" },
                  ].map(b => (
                    <div key={b.label} className="trust-item">
                      <b.icon className="!text-success" />
                      <span>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ Mobile bottom nav ═══ */}
      <nav className="mobile-bottom-nav">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { icon: HomeIcon, label: "Accueil", to: "/", active: true },
            { icon: FolderOpen, label: "Projets", to: isAuthenticated ? "/dashboard" : "/login", active: false },
            { icon: HardHat, label: "Pros", to: "/search", active: false },
            { icon: Brain, label: "Alex", to: "/alex", active: false, glow: true },
          ].map(item => (
            <Link
              key={item.label}
              to={item.to}
              className={`mobile-nav-item ${item.active ? "active" : ""}`}
            >
              <item.icon className={`h-5 w-5 ${item.glow ? "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" : ""}`} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Alex assistant */}
      <AlexAssistantSheet
        open={alexOpen}
        onClose={() => { setAlexOpen(false); setAlexChip(undefined); }}
        initialChip={alexChip}
      />
    </div>
  );
};

export default Home;
