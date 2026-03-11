import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Home as HomeIcon, Shield, TrendingUp, Users,
  Sparkles, ArrowRight, Star, Clock,
  MessageCircle, CalendarDays, Heart, Brain, FolderOpen, Lightbulb, HardHat,
  Building2, Handshake, FileText, Trophy, CheckCircle2, ChevronRight,
  Upload, BarChart3, Quote, Zap, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-home.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

const Home = () => {
  const { isAuthenticated, role } = useAuth();
  const dash = role === "contractor" ? "/pro" : role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative overflow-hidden min-h-[94vh] flex flex-col">
        {/* Background layers */}
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        {/* Ambient glow blobs */}
        <div className="absolute top-[5%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[15%] right-[-15%] w-[40vw] h-[40vw] rounded-full bg-secondary/8 blur-[100px] pointer-events-none" />
        <div className="absolute top-[40%] right-[10%] w-[20vw] h-[20vw] rounded-full bg-accent/6 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-10 pt-24">
          <motion.div className="max-w-lg mx-auto w-full space-y-6" initial="hidden" animate="visible">
            {/* Eyebrow */}
            <motion.div variants={fadeUp} custom={0}>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 border border-primary/15 px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-caption font-semibold text-primary">Plateforme IA pour l'habitation</span>
              </div>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-[2.25rem] md:text-[3.25rem] leading-[1.04] font-bold tracking-[-0.035em] text-foreground"
            >
              Trouvez l'Entrepreneur{" "}
              <span className="text-gradient">Idéal</span>{" "}
              pour vos Travaux
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-body-lg text-muted-foreground leading-relaxed max-w-md">
              Comparez, évaluez et choisissez en toute confiance grâce à l'analyse IA de vos soumissions.
            </motion.p>

            {/* CTA group */}
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="xl" className="rounded-xl shadow-glow">
                <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                  Analyser mes soumissions
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="rounded-xl">
                <Link to="/search">
                  Trouver un Pro
                </Link>
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeUp} custom={4} className="flex items-center gap-5 pt-2">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="divider-gradient w-px h-8 rotate-0" style={{ background: 'hsl(var(--border))' }} />
              <div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-current text-amber-400" />
                  ))}
                  <span className="text-meta font-bold ml-1">4.9</span>
                </div>
                <p className="text-caption text-muted-foreground">+10,000 projets réussis</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ COMMENT ÇA MARCHE ══════════════════════ */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Comment ça marche</p>
            <h2 className="font-display text-section text-foreground">Trois étapes vers le bon entrepreneur</h2>
          </motion.div>

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
                <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center relative">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                  <div className="h-10 w-10 mx-auto rounded-lg bg-primary/8 flex items-center justify-center mb-3 mt-1">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-display text-meta font-semibold text-foreground">{item.title}</p>
                  <p className="text-caption text-muted-foreground">{item.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ QUOTE COMPARISON PREVIEW ══════════════════════ */}
      <section className="px-5 py-16">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Analyse IA</p>
            <h2 className="font-display text-section text-foreground">Comparez 3 soumissions en 30 secondes</h2>
            <p className="text-meta text-muted-foreground mt-2">Notre IA analyse prix, couverture et clauses.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4 shadow-elevation">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { name: "Soumission A", price: "8 500$", score: 72, best: false },
                  { name: "Soumission B", price: "7 200$", score: 91, best: true },
                  { name: "Soumission C", price: "9 800$", score: 65, best: false },
                ].map((q) => (
                  <div key={q.name} className={`rounded-lg p-3 transition-colors ${q.best ? "bg-success/8 border border-success/20" : "bg-muted/30 border border-transparent"}`}>
                    <p className="text-caption font-medium text-muted-foreground">{q.name}</p>
                    <p className="font-display text-body font-bold text-foreground mt-1">{q.price}</p>
                    <div className="mt-2">
                      <p className={`font-display text-lg font-bold ${q.best ? "text-success" : q.score < 70 ? "text-destructive" : "text-muted-foreground"}`}>{q.score}</p>
                      <p className="text-caption text-muted-foreground/60">/100</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/6 border border-success/12">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-caption text-foreground"><strong>Recommandation IA :</strong> Soumission B offre le meilleur rapport qualité-prix.</p>
              </div>

              <Button asChild size="lg" className="w-full rounded-lg">
                <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                  Analyser mes soumissions <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ HOME SCORE PREVIEW ══════════════════════ */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <p className="text-caption font-semibold text-success tracking-widest uppercase mb-2">Score Maison</p>
            <h2 className="font-display text-section text-foreground">Connaissez la santé de votre propriété</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4 shadow-elevation">
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--success))" strokeWidth="6"
                      strokeDasharray="264" strokeDashoffset="50" strokeLinecap="round" className="score-ring" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-xl font-bold text-foreground">81</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-display text-body font-semibold text-foreground">Bon état général</p>
                  <p className="text-caption text-muted-foreground">2 points d'attention identifiés</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Structure", score: 88, color: "bg-success" },
                  { label: "Systèmes", score: 74, color: "bg-warning" },
                  { label: "Extérieur", score: 82, color: "bg-success" },
                  { label: "Intérieur", score: 79, color: "bg-primary" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-muted/25 p-2.5 border border-border/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-caption font-medium text-muted-foreground">{s.label}</span>
                      <span className="text-caption font-bold text-foreground">{s.score}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <Button asChild variant="success" size="lg" className="w-full rounded-lg">
                <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                  Calculer mon Score Maison <Heart className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ FEATURED CONTRACTORS ══════════════════════ */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-lg mx-auto w-full px-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-1">Entrepreneurs vedettes</p>
              <h2 className="font-display text-section text-foreground">Vérifiés et recommandés</h2>
            </div>
            <Link to="/search" className="text-caption font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
              Voir tous <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-2.5"
          >
            {[
              { name: "TOITURE EXPERT", specialty: "Toiture & Couverture", city: "Montréal", score: 92, rating: 4.9, reviews: 47, years: 18 },
              { name: "PLOMBERIE PRO", specialty: "Plomberie", city: "Laval", score: 88, rating: 4.8, reviews: 34, years: 12 },
              { name: "RÉNO MAÎTRE", specialty: "Rénovation générale", city: "Québec", score: 85, rating: 4.7, reviews: 29, years: 15 },
            ].map((c, i) => (
              <motion.div key={c.name} variants={fadeUp} custom={i}>
                <Link to="/search">
                  <div className="rounded-xl border border-border/40 bg-card/80 p-4 group hover:border-primary/20 hover:bg-card transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center">
                        <span className="font-display text-sm font-bold text-gradient">{c.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-meta font-semibold text-foreground truncate">{c.name}</h3>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-success bg-success/8 border border-success/15 rounded-full px-1.5 py-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" /> Vérifié
                          </span>
                        </div>
                        <p className="text-caption text-muted-foreground">{c.specialty} · {c.city}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-current text-amber-400" />
                            <span className="text-caption font-semibold text-foreground">{c.rating}</span>
                            <span className="text-caption text-muted-foreground/60">({c.reviews})</span>
                          </div>
                          <span className="text-caption text-muted-foreground/60">{c.years} ans exp.</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-center">
                        <div className="bg-primary/10 border border-primary/15 text-primary font-display font-bold text-meta px-2.5 py-1.5 rounded-lg">
                          {c.score}<span className="text-caption font-normal opacity-60">/100</span>
                        </div>
                        <span className="text-[9px] font-semibold text-primary/60">AIPP</span>
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
      <section className="relative px-5 py-16">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Choisissez votre parcours</p>
            <h2 className="font-display text-section text-foreground">À qui s'adresse UNPRO ?</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-2.5">
            {[
              {
                icon: HomeIcon, title: "Propriétaires", desc: "Gérez votre propriété et trouvez des professionnels de confiance.",
                cta: "Gérer ma propriété", to: isAuthenticated ? dash : "/homeowners",
                color: "from-primary/15 to-primary/5",
              },
              {
                icon: HardHat, title: "Professionnels", desc: "Développez votre entreprise avec des projets qualifiés.",
                cta: "Inscrire mon entreprise", to: "/professionals",
                color: "from-secondary/15 to-secondary/5",
              },
              {
                icon: Handshake, title: "Partenaires", desc: "Assurances, banques, municipalités — intégrez l'écosystème.",
                cta: "Explorer", to: "/partners",
                color: "from-accent/15 to-accent/5",
              },
            ].map((card, i) => (
              <motion.div key={card.title} variants={fadeUp} custom={i}>
                <Link to={card.to} className="block">
                  <div className="rounded-xl border border-border/40 bg-card/80 p-5 group hover:border-primary/20 hover:bg-card transition-all duration-300 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${card.color} blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
                    <div className="relative flex items-center gap-4">
                      <div className="h-11 w-11 shrink-0 rounded-lg bg-muted/60 flex items-center justify-center border border-border/30">
                        <card.icon className="h-5 w-5 text-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-foreground text-body">{card.title}</h3>
                        <p className="text-caption text-muted-foreground mt-0.5 leading-relaxed">{card.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
      <section className="px-5 py-16">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Témoignages</p>
            <h2 className="font-display text-section text-foreground">Ce que nos utilisateurs disent</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-2.5">
            {[
              { name: "Marie-Claude D.", role: "Propriétaire, Montréal", text: "L'analyse IA des soumissions m'a fait économiser 3 200$ sur ma rénovation de cuisine. Un outil indispensable.", rating: 5 },
              { name: "Jean-François L.", role: "Entrepreneur en toiture", text: "Depuis que j'utilise UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé en 3 mois.", rating: 5 },
              { name: "Sophie T.", role: "Propriétaire, Québec", text: "Le Score Maison m'a permis de prioriser mes travaux. J'ai pu planifier un budget réaliste sur 5 ans.", rating: 5 },
            ].map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i}>
                <div className="rounded-xl border border-border/40 bg-card/60 p-5 space-y-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <Star key={si} className="h-3 w-3 fill-current text-amber-400" />
                    ))}
                  </div>
                  <p className="text-meta text-foreground/80 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center border border-border/30">
                      <span className="text-caption font-bold text-foreground/60">{t.name.charAt(0)}</span>
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

      {/* ══════════════════════ ALEX IA ══════════════════════ */}
      <section className="relative px-5 py-10 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="rounded-xl border border-border/40 bg-card p-5 shadow-elevation">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow animate-glow-pulse">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground text-body">Alex <span className="text-muted-foreground font-normal text-meta">— Conseiller IA</span></p>
                  <p className="text-caption text-muted-foreground">Posez vos questions sur vos travaux.</p>
                </div>
              </div>
              <Button asChild size="lg" variant="outline" className="mt-4 w-full rounded-lg gap-1.5">
                <Link to="/alex"><MessageCircle className="h-4 w-4" /> Parler avec Alex</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section className="px-5 py-16">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/8 border border-primary/15 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(222,100%,65%,0.1),transparent_60%)] pointer-events-none" />
              <div className="relative z-10 space-y-5">
                <div className="h-12 w-12 mx-auto rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-display text-section text-foreground">Prêt à trouver votre entrepreneur?</h2>
                <p className="text-meta text-muted-foreground max-w-sm mx-auto">
                  Créez votre compte gratuit et commencez à comparer les soumissions dès maintenant.
                </p>
                <Button asChild size="xl" className="rounded-xl shadow-glow">
                  <Link to={isAuthenticated ? dash : "/signup"}>
                    Commencer gratuitement <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <div className="flex justify-center items-center gap-4 pt-2">
                  {[
                    { icon: CheckCircle2, label: "Gratuit" },
                    { icon: Shield, label: "Sécurisé" },
                    { icon: Heart, label: "Sans engagement" },
                  ].map((b) => (
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

      {/* ══════════════════════ MOBILE BOTTOM NAV ══════════════════════ */}
      <nav className="sticky bottom-0 z-30 border-t border-border/20 bg-background/90 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around h-14 px-2">
          {[
            { icon: HomeIcon, label: "Accueil", to: "/", active: true },
            { icon: FolderOpen, label: "Projets", to: isAuthenticated ? "/dashboard" : "/login", active: false },
            { icon: HardHat, label: "Pros", to: "/search", active: false },
            { icon: Brain, label: "Alex", to: "/alex", active: false },
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
