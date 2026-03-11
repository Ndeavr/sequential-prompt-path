import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Home as HomeIcon, Shield, TrendingUp, Users,
  Sparkles, ArrowRight, Star, Clock,
  MessageCircle, CalendarDays, Heart, Brain, FolderOpen, Lightbulb, HardHat,
  Building2, Handshake, FileText, Trophy, CheckCircle2, ChevronRight,
  Upload, BarChart3, Quote, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-home.jpg";

/* ─── Animation presets ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const Home = () => {
  const { isAuthenticated, role } = useAuth();
  const dash = role === "contractor" ? "/pro" : role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,6%,0.45)] via-[hsl(222,47%,8%,0.25)] to-[hsl(222,47%,6%,0.85)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="absolute top-[5%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-primary/15 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-15%] w-[35vw] h-[35vw] rounded-full bg-accent/10 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-8 pt-20">
          <motion.div className="max-w-lg mx-auto w-full space-y-5" initial="hidden" animate="visible">
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="text-[2rem] md:text-[3rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-white"
            >
              Trouvez l'Entrepreneur{" "}
              <span className="bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
                Idéal
              </span>{" "}
              pour vos Travaux
            </motion.h1>

            <motion.p variants={fadeUp} custom={1} className="text-sm text-white/65 leading-relaxed max-w-sm">
              Comparez, évaluez et choisissez en toute confiance grâce à l'analyse IA.
            </motion.p>

            {/* Search bar */}
            <motion.div variants={fadeUp} custom={2}>
              <div className="flex items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-xl px-4 py-3.5 shadow-xl shadow-black/10">
                <HomeIcon className="h-5 w-5 text-muted-foreground/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Quel type de travaux ?</p>
                  <p className="text-[11px] text-muted-foreground">Ex: Rénovation, cuisine, toiture...</p>
                </div>
                <Link
                  to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}
                  className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-glow hover:scale-105 transition-transform"
                >
                  <ArrowRight className="h-4 w-4 text-primary-foreground" />
                </Link>
              </div>
            </motion.div>

            {/* Popular tags */}
            <motion.div variants={fadeUp} custom={3} className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Populaire</span>
              {["🏗 Rénovation", "🏠 Construction", "📐 Agrandissement"].map((tag) => (
                <Link
                  key={tag}
                  to="/search"
                  className="rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/20 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </motion.div>

            {/* Dashboard preview hint */}
            <motion.div variants={fadeUp} custom={4} className="flex items-center gap-2 pt-2">
              <div className="flex -space-x-1">
                {[HomeIcon, BarChart3, FileText].map((Icon, i) => (
                  <div key={i} className="h-7 w-7 rounded-lg bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-white/70" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/50">Tableau de bord • Score Maison • Analyse IA</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ COMMENT ÇA MARCHE ══════════════════════ */}
      <section className="relative px-5 py-10 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg font-bold text-foreground mb-6"
          >
            Comment ça marche ?
          </motion.h2>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { step: "1", icon: FileText, title: "Décrivez", subtitle: "votre projet" },
              { step: "2", icon: Search, title: "Comparez", subtitle: "les soumissions" },
              { step: "3", icon: Trophy, title: "Choisissez", subtitle: "le meilleur pro" },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-4 text-center shadow-sm relative">
                  <div className="absolute -top-2.5 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-sm">
                    {item.step}
                  </div>
                  <div className="h-11 w-11 mx-auto rounded-xl bg-primary/8 flex items-center justify-center mb-2">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 flex items-center justify-between"
          >
            <div>
              <p className="text-2xl font-extrabold text-foreground">+10 000</p>
              <p className="text-xs text-muted-foreground">projets réussis</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current text-amber-400" />
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">4.9/5</p>
                <p className="text-[10px] text-muted-foreground">basé sur 2,500 avis</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ QUOTE COMPARISON PREVIEW ══════════════════════ */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-1">Analyse IA</p>
            <h2 className="text-lg font-bold text-foreground">Comparez 3 soumissions en 30 secondes</h2>
            <p className="text-meta text-muted-foreground mt-1">Notre IA analyse prix, couverture et clauses pour vous.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="glass-card-elevated rounded-2xl p-5 space-y-4">
              {/* Mock comparison table */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { name: "Soumission A", price: "8 500$", score: 72, color: "text-muted-foreground" },
                  { name: "Soumission B", price: "7 200$", score: 91, color: "text-success" },
                  { name: "Soumission C", price: "9 800$", score: 65, color: "text-destructive" },
                ].map((q) => (
                  <div key={q.name} className={`rounded-xl p-3 ${q.score === 91 ? "bg-success/6 ring-1 ring-success/20" : "bg-muted/30"}`}>
                    <p className="text-caption font-semibold text-muted-foreground">{q.name}</p>
                    <p className="text-body font-bold text-foreground mt-1">{q.price}</p>
                    <div className="mt-2">
                      <p className={`text-lg font-extrabold ${q.color}`}>{q.score}</p>
                      <p className="text-caption text-muted-foreground">/100</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/6 border border-success/15">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-caption text-foreground"><strong>Recommandation IA :</strong> Soumission B offre le meilleur rapport qualité-prix.</p>
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

      {/* ══════════════════════ HOME SCORE PREVIEW ══════════════════════ */}
      <section className="relative px-5 py-10 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <p className="text-caption font-semibold text-success tracking-widest uppercase mb-1">Score Maison</p>
            <h2 className="text-lg font-bold text-foreground">Connaissez la santé de votre propriété</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="glass-card-elevated rounded-2xl p-5 space-y-4">
              {/* Score ring mock */}
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--success))" strokeWidth="8"
                      strokeDasharray="264" strokeDashoffset="50" strokeLinecap="round" className="score-ring" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-extrabold text-foreground">81</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-body font-bold text-foreground">Bon état général</p>
                  <p className="text-caption text-muted-foreground">2 points d'attention identifiés</p>
                </div>
              </div>

              {/* Sub-scores */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Structure", score: 88, color: "bg-success" },
                  { label: "Systèmes", score: 74, color: "bg-warning" },
                  { label: "Extérieur", score: 82, color: "bg-success" },
                  { label: "Intérieur", score: 79, color: "bg-primary" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-muted/30 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-caption font-medium text-muted-foreground">{s.label}</span>
                      <span className="text-caption font-bold text-foreground">{s.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <Button asChild variant="success" size="lg" className="w-full rounded-xl">
                <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                  Calculer mon Score Maison <Heart className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ CTA PRINCIPAL ══════════════════════ */}
      <section className="px-5 pb-6">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Button
              asChild
              size="xl"
              className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_8px_32px_-4px_hsl(222,100%,61%,0.45)] hover:shadow-[0_8px_40px_-4px_hsl(222,100%,61%,0.6)] transition-shadow"
            >
              <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                Décrivez votre projet
                <ChevronRight className="h-5 w-5 ml-1" />
              </Link>
            </Button>

            <div className="flex items-center justify-center gap-4 mt-4">
              {[
                { icon: CheckCircle2, label: "Gratuit & Rapide" },
                { icon: Shield, label: "Sécurisé" },
                { icon: Heart, label: "Sans engagement" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-1">
                  <b.icon className="h-3 w-3 text-success" />
                  <span className="text-[10px] font-medium text-muted-foreground">{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ FEATURED CONTRACTORS ══════════════════════ */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-lg mx-auto w-full px-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-5"
          >
            <h2 className="text-lg font-bold text-foreground">Entrepreneurs vedettes</h2>
            <Link to="/search" className="text-caption font-semibold text-primary flex items-center gap-1">
              Voir tous <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-3"
          >
            {[
              { name: "TOITURE EXPERT", specialty: "Toiture & Couverture", city: "Montréal", score: 92, rating: 4.9, reviews: 47, years: 18 },
              { name: "PLOMBERIE PRO", specialty: "Plomberie", city: "Laval", score: 88, rating: 4.8, reviews: 34, years: 12 },
              { name: "RÉNO MAÎTRE", specialty: "Rénovation générale", city: "Québec", score: 85, rating: 4.7, reviews: 29, years: 15 },
            ].map((c, i) => (
              <motion.div key={c.name} variants={fadeUp} custom={i}>
                <Link to="/search">
                  <div className="glass-card-elevated rounded-2xl p-4 group">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/8 flex items-center justify-center">
                        <span className="text-base font-bold text-gradient">{c.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-meta font-bold text-foreground truncate">{c.name}</h3>
                          <Badge variant="secondary" className="text-[9px] bg-success/10 text-success border-0 rounded-full px-1.5 py-0">
                            <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Vérifié
                          </Badge>
                        </div>
                        <p className="text-caption text-muted-foreground">{c.specialty} • {c.city}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-current text-amber-400" />
                            <span className="text-caption font-semibold text-foreground">{c.rating}</span>
                            <span className="text-caption text-muted-foreground">({c.reviews})</span>
                          </div>
                          <span className="text-caption text-muted-foreground">{c.years} ans</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-center">
                        <div className="bg-primary text-primary-foreground font-extrabold text-body px-2.5 py-1.5 rounded-lg">
                          {c.score}<span className="text-caption font-normal opacity-70">/100</span>
                        </div>
                        <span className="text-[9px] font-semibold text-success">AIPP</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ AUDIENCE GATEWAY ══════════════════════ */}
      <section className="relative px-5 py-10">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-1">Choisissez votre parcours</p>
            <h2 className="text-lg font-bold text-foreground">À qui s'adresse UNPRO ?</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {[
              {
                icon: HomeIcon, title: "Propriétaires", desc: "Gérez votre propriété et trouvez des professionnels de confiance.",
                cta: "Gérer ma propriété", to: isAuthenticated ? dash : "/homeowners",
                iconBg: "bg-primary", gradient: "bg-primary/20",
              },
              {
                icon: HardHat, title: "Professionnels", desc: "Développez votre entreprise avec des projets qualifiés.",
                cta: "Inscrire mon entreprise", to: "/professionals",
                iconBg: "bg-secondary", gradient: "bg-secondary/20",
              },
              {
                icon: Handshake, title: "Partenaires & Institutions", desc: "Assurances, banques, municipalités — intégrez l'écosystème.",
                cta: "Explorer les partenariats", to: "/partners",
                iconBg: "bg-gradient-to-br from-accent to-primary", gradient: "bg-accent/20",
              },
            ].map((card, i) => (
              <motion.div key={card.title} variants={fadeUp} custom={i}>
                <Link to={card.to} className="block">
                  <div className="glass-card-elevated rounded-2xl p-5 group relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-28 h-28 rounded-full ${card.gradient} blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
                    <div className="relative flex items-center gap-4">
                      <div className={`h-12 w-12 shrink-0 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                        <card.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-body">{card.title}</h3>
                        <p className="text-caption text-muted-foreground mt-0.5 leading-relaxed">{card.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-1">Témoignages</p>
            <h2 className="text-lg font-bold text-foreground">Ce que nos utilisateurs disent</h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-3"
          >
            {[
              {
                name: "Marie-Claude D.",
                role: "Propriétaire, Montréal",
                text: "L'analyse IA des soumissions m'a fait économiser 3 200$ sur ma rénovation de cuisine. Un outil indispensable.",
                rating: 5,
              },
              {
                name: "Jean-François L.",
                role: "Entrepreneur en toiture",
                text: "Depuis que j'utilise UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé en 3 mois.",
                rating: 5,
              },
              {
                name: "Sophie T.",
                role: "Propriétaire, Québec",
                text: "Le Score Maison m'a permis de prioriser mes travaux. J'ai pu planifier un budget réaliste sur 5 ans.",
                rating: 5,
              },
            ].map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <Star key={si} className="h-3.5 w-3.5 fill-current text-amber-400" />
                    ))}
                  </div>
                  <p className="text-meta text-foreground leading-relaxed italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center">
                      <span className="text-meta font-bold text-gradient">{t.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-meta font-semibold text-foreground">{t.name}</p>
                      <p className="text-caption text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ ALEX IA ══════════════════════ */}
      <section className="relative px-5 py-8 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="glass-card-elevated rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-body">Alex <span className="text-muted-foreground font-normal text-meta">— Conseiller IA</span></p>
                  <p className="text-caption text-muted-foreground">Posez vos questions sur vos travaux.</p>
                </div>
              </div>
              <Button asChild size="lg" variant="outline" className="mt-4 w-full rounded-xl gap-1.5">
                <Link to="/alex"><MessageCircle className="h-4 w-4" /> Parler avec Alex</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ ENTREPRENEUR CTA ══════════════════════ */}
      <section className="py-10 px-5">
        <div className="max-w-lg mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-2"
          >
            <h2 className="text-lg font-bold text-foreground">Vous êtes entrepreneur?</h2>
            <p className="text-meta text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Rejoignez UNPRO pour recevoir des demandes qualifiées.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: TrendingUp, label: "Score AIPP" },
              { icon: Users, label: "Leads qualifiés" },
              { icon: Building2, label: "Territoires" },
              { icon: Shield, label: "Badge vérifié" },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} custom={0}>
                <div className="glass-card rounded-xl p-4 text-center shadow-sm">
                  <item.icon className="h-5 w-5 text-primary mx-auto" />
                  <p className="text-caption font-semibold text-foreground mt-2">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="flex justify-center">
            <Button asChild size="lg" variant="secondary" className="rounded-2xl h-12 min-w-[200px] text-meta shadow-sm">
              <Link to="/signup">Activer mon profil <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section className="px-5 py-14">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-2xl bg-gradient-to-r from-primary to-accent p-6 text-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(0,0%,100%,0.08),transparent_60%)] pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <Sparkles className="h-8 w-8 text-white/80 mx-auto" />
                <h2 className="text-lg font-bold text-white">Prêt à trouver votre entrepreneur?</h2>
                <p className="text-meta text-white/70 max-w-sm mx-auto">
                  Créez votre compte gratuit et commencez à comparer les soumissions dès maintenant.
                </p>
                <Button asChild size="lg" className="rounded-2xl h-12 bg-white text-primary hover:bg-white/90 font-bold shadow-lg">
                  <Link to={isAuthenticated ? dash : "/signup"}>
                    Commencer gratuitement <ChevronRight className="h-5 w-5 ml-1" />
                  </Link>
                </Button>
                <div className="flex justify-center -space-x-2 pt-2">
                  {[1,2,3,4,5,6].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center text-[9px] font-bold text-white">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="h-8 w-8 rounded-full border-2 border-white/30 bg-white/20 flex items-center justify-center text-[9px] font-bold text-white backdrop-blur-sm">
                    +2k
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ MOBILE BOTTOM NAV ══════════════════════ */}
      <nav className="sticky bottom-0 z-30 glass-surface border-t border-border/30 md:hidden">
        <div className="flex items-center justify-around h-14 px-2">
          {[
            { icon: HomeIcon, label: "Accueil", to: "/", active: true },
            { icon: FolderOpen, label: "Projets", to: isAuthenticated ? "/dashboard" : "/login", active: false },
            { icon: HardHat, label: "Entrepreneurs", to: "/search", active: false },
            { icon: Lightbulb, label: "Conseils", to: "/alex", active: false },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 transition-colors ${item.active ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
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
